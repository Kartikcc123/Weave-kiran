import asyncio
import time
import cv2
import json
from datetime import datetime
from typing import List
from detector import detect
from database import db

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from camera import get_camera
from detector import detect

app = FastAPI(title="Fabric AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

camera = get_camera()

class State:
    def __init__(self):
        self.latest_frame_bytes = None
        self.is_running = True
        
        # Stats
        self.total_defects = 0
        self.major_defects = 0
        self.defect_counts = {
            "Stain": 0,
            "Thread": 0,
            "Warp_Weft": 0,
            "hole": 0,
            "seam": 0
        }
        
        # Tracking
        self.active_tracks = {} # track_id -> dict
        self.next_track_id = 1
        self.track_timeout = 2.0 # seconds before track is CLOSED
        self.iou_threshold = 0.3
        self.distance_threshold = 150 # pixels fallback

state = State()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[WS_ERROR] Failed to send JSON: {e}")

manager = ConnectionManager()

def get_center(bbox):
    return (
        (bbox["x1"] + bbox["x2"]) / 2,
        (bbox["y1"] + bbox["y2"]) / 2
    )

def calculate_iou(box1, box2):
    x1 = max(box1['x1'], box2['x1'])
    y1 = max(box1['y1'], box2['y1'])
    x2 = min(box1['x2'], box2['x2'])
    y2 = min(box1['y2'], box2['y2'])
    
    inter_area = max(0, x2 - x1) * max(0, y2 - y1)
    if inter_area == 0:
        return 0.0
        
    box1_area = (box1['x2'] - box1['x1']) * (box1['y2'] - box1['y1'])
    box2_area = (box2['x2'] - box2['x1']) * (box2['y2'] - box2['y1'])
    
    denom = float(box1_area + box2_area - inter_area)
    if denom <= 0.0:
        return 0.0
    return inter_area / denom

def get_severity(confidence):
    if confidence >= 0.80: return "HIGH"
    if confidence >= 0.60: return "MEDIUM"
    return "LOW"

def match_track(d, tracks, iou_thresh, dist_thresh):
    cx, cy = get_center(d["bbox"])
    best_match_id = None
    best_iou = 0.0
    
    for tid, track in tracks.items():
        iou = calculate_iou(d["bbox"], track["bbox"])
        if iou > best_iou:
            best_iou = iou
            best_match_id = tid
            
    if best_iou >= iou_thresh and best_match_id is not None:
        return tracks[best_match_id]
        
    # Fallback to distance
    best_dist_sq = float('inf')
    best_dist_id = None
    
    for tid, track in tracks.items():
        tcx, tcy = get_center(track["bbox"])
        dist_sq = (tcx - cx)**2 + (tcy - cy)**2
        if dist_sq <= dist_thresh**2 and dist_sq < best_dist_sq:
            best_dist_sq = dist_sq
            best_dist_id = tid
            
    if best_dist_id is not None:
        return tracks[best_dist_id]
            
    return None

async def async_background_loop():
    loop = asyncio.get_running_loop()
    last_ws_send = 0
    ws_throttle = 1.0 / 10.0 # 10 updates per sec max
    
    from collections import Counter
    
    while state.is_running:
        try:
            success, frame = await loop.run_in_executor(None, camera.read)
            if not success:
                await asyncio.sleep(0.01)
                continue
    
            detections = await loop.run_in_executor(None, detect, frame)
            current_time = time.time()
            
            # 1. Cleanup old tracks (LOST -> CLOSED)
            closed_keys = [tid for tid, t in state.active_tracks.items() if current_time - t["last_seen"] > state.track_timeout]
            for k in closed_keys:
                print(f"[TRACK] track_id={k} CLOSED")
                t = state.active_tracks[k]
                asyncio.create_task(db.update_defect_status(t["event_id"], "CLOSED", t["max_confidence"], t["severity"]))
                del state.active_tracks[k]
    
            new_events = []
            current_detections = []
            
            # 2. Process detections
            for d in detections:
                match = match_track(d, state.active_tracks, state.iou_threshold, state.distance_threshold)
                
                if match:
                    # Update TRACKING state
                    match["bbox"] = d["bbox"]
                    match["last_seen"] = current_time
                    
                    # Class smoothing
                    match["class_history"].append(d["class_name"])
                    if len(match["class_history"]) > 20:
                        match["class_history"].pop(0)
                        
                    # Majority vote
                    most_common_class = Counter(match["class_history"]).most_common(1)[0][0]
                    match["class_name"] = most_common_class
                    
                    # Update max confidence and check severity jump
                    old_conf = match["max_confidence"]
                    new_conf = max(old_conf, d["confidence"])
                    
                    if not match.get("reported_major", False) and new_conf >= 0.80:
                        state.major_defects += 1 # Upgraded to HIGH
                        match["reported_major"] = True
                        
                    match["max_confidence"] = new_conf
                    match["severity"] = get_severity(new_conf)
                    current_detections.append(match)
                    
                else:
                    # NEW DEFECT
                    tid = state.next_track_id
                    state.next_track_id += 1
                    
                    event_id = f"DEF-{datetime.now().strftime('%Y%m%d')}-{tid:06d}"
                    
                    new_track = {
                        "track_id": tid,
                        "event_id": event_id,
                        "class_id": d["class_id"],
                        "class_name": d["class_name"],
                        "class_history": [d["class_name"]],
                        "max_confidence": d["confidence"],
                        "bbox": d["bbox"],
                        "severity": get_severity(d["confidence"]),
                        "last_seen": current_time,
                        "start_time": current_time,
                        "reported_major": False
                    }
                    
                    print(f"[YOLO] {new_track['class_name']} {new_track['max_confidence']}")
                    print(f"[TRACK] New track created track_id={tid}")
                    print(f"[EVENT] NEW DEFECT event_id={event_id} class={new_track['class_name']} confidence={new_track['max_confidence']}")
                    
                    state.active_tracks[tid] = new_track
                    current_detections.append(new_track)
                    
                    # Increment stats once per physical defect
                    state.total_defects += 1
                    if new_track["severity"] == "HIGH":
                        state.major_defects += 1
                        new_track["reported_major"] = True
                        
                    if new_track["class_name"] in state.defect_counts:
                        state.defect_counts[new_track["class_name"]] += 1
                        
                    event_data = {
                        "event_id": event_id,
                        "loom_id": "LOOM-01",
                        "roll_id": None,
                        "track_id": tid,
                        "defect_type": new_track["class_name"],
                        "class_id": d["class_id"],
                        "confidence": new_track["max_confidence"],
                        "severity": new_track["severity"],
                        "timestamp": datetime.now().isoformat(),
                        "bbox": new_track["bbox"],
                        "status": "OPEN"
                    }
                    
                    asyncio.create_task(db.save_defect_event(event_data))
                    
                    # Send to frontend as NEW event
                    new_events.append(event_data)
    
                # Draw on frame using CURRENT confidence
                bbox = d["bbox"]
                x1, y1, x2, y2 = bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]
                label = f'{d["class_name"]} {d["confidence"]:.2f}'
                
                color = (0, 0, 200) if d["confidence"] >= 0.80 else ((0, 165, 255) if d["confidence"] >= 0.60 else (128, 128, 128))
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, label, (x1, max(25, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

            # 3. Broadcast events
            # Send if there are new events OR if there are current detections (throttled) OR if tracks just cleared
            should_send = False
            if len(new_events) > 0:
                should_send = True
            elif current_time - last_ws_send > ws_throttle:
                should_send = True
    
            if should_send:
                # For current_detections payload, only send necessary UI fields
                frontend_current = [
                    {
                        "track_id": t["track_id"],
                        "class_name": t["class_name"],
                        "confidence": t["max_confidence"],
                        "severity": t["severity"]
                    }
                    for t in state.active_tracks.values()
                ]
    
                event_payload = {
                    "timestamp": datetime.now().isoformat(),
                    "loom_id": "LOOM-01",
                    "current_detections": frontend_current,
                    "new_events": new_events,
                    "stats": {
                        "total_defects": state.total_defects,
                        "major_defects": state.major_defects,
                        "defect_counts": state.defect_counts
                    }
                }
                
                
                await manager.broadcast(event_payload)
                last_ws_send = current_time
                if len(new_events) > 0:
                    print("[WS] Sent new defect event data")
    
            # Encode frame
            success, encoded = cv2.imencode(".jpg", frame)
            if success:
                state.latest_frame_bytes = encoded.tobytes()
    
            # Yield thread
            await asyncio.sleep(0.01)
        
        except Exception as e:
            print(f"[ERROR] Exception in background loop: {e}")
            await asyncio.sleep(0.5)

@app.on_event("startup")
async def startup_event():
    await db.connect()
    asyncio.create_task(async_background_loop())
    
@app.on_event("shutdown")
async def shutdown_event():
    db.disconnect()

async def video_generator():
    while True:
        if state.latest_frame_bytes is not None:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + state.latest_frame_bytes
                + b"\r\n"
            )
        await asyncio.sleep(0.033) # ~30fps max

@app.get("/")
def root():
    return {"status": "online", "service": "Fabric AI"}

@app.get("/video")
def video():
    return StreamingResponse(
        video_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.websocket("/ws/detections")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/status")
def get_status():
    return {
        "status": "running",
        "loom_id": "LOOM-01",
        "model": "YOLO26s",
        "camera": "DroidCam",
        "camera_index": 1
    }

@app.get("/stats")
async def get_stats():
    # Return actual database statistics
    stats = await db.get_stats()
    return stats

@app.get("/api/defects")
async def get_defects(limit: int = 50):
    defects = await db.get_recent_defects(limit)
    return defects
    
@app.get("/api/defects/today")
async def get_defects_today():
    defects = await db.get_today_defects()
    return defects