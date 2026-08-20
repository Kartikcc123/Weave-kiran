# FABRIC AI
# Current System Architecture & Data Flow Report

## 1. Executive Summary
This report analyzes the current implementation of the "FABRIC AI" live defect detection prototype. The system streams camera frames through a YOLO26s model, annotates bounding boxes, tracks defects, and broadcasts events to a React dashboard via WebSockets. The primary goal of this audit is to identify the root cause of the duplicate defect counting issue (e.g., 27 reported defects for a single physical anomaly) and document the end-to-end data pipeline.

## 2. Current Folder Structure
Based on the current project directory, the relevant structure is:
```text
D:\fabric-ai
│
├── app/                      ← React/Vite frontend dashboard
│   ├── src/components/       ← UI components (LiveInspection.jsx, etc.)
│   └── src/context/          ← SimulationContext.jsx (WebSocket handler)
│
├── backend/                  ← FastAPI Python backend
│   ├── main.py               ← Core backend loop, tracking, and WebSocket manager
│   ├── camera.py             ← OpenCV camera initialization
│   └── detector.py           ← YOLO26s inference wrapper
│
├── best.pt                   ← YOLO model weights
├── camera_test.py            ← Diagnostic script
├── live_test.py              ← Diagnostic script
├── test_model.py             ← Diagnostic script
└── verify_fabric2025.py      ← Diagnostic script
```

## 3. Camera System
- **File**: `backend/camera.py`
- **Method**: OpenCV `cv2.VideoCapture`
- **Index**: 1
- **Backend**: `cv2.CAP_DSHOW` (DirectShow, typical for Windows virtual cameras like DroidCam)
- **Resolution**: Hardcoded to 1280x720 via `CAP_PROP_FRAME_WIDTH/HEIGHT`
- **Capture Loop**: Frames are captured synchronously inside `backend/main.py` inside the `async_background_loop`.

## 4. Frame Capture
- **Pipeline**: In `main.py`, `await loop.run_in_executor(None, camera.read)` fetches frames continuously in a `while state.is_running:` loop.
- **FPS Control**: There is no strict FPS throttling on the capture itself. The loop runs as fast as `camera.read()` and `detect()` allow, with a fallback `await asyncio.sleep(0.01)` to yield to the event loop.
- **Buffering**: OpenCV buffers frames internally. If `detect()` is slower than the camera framerate, OpenCV may buffer old frames, leading to latency.

## 5. YOLO26s Inference
- **File**: `backend/detector.py`
- **Model**: `ultralytics.YOLO` loading `D:\fabric-ai\best.pt`
- **Execution**: `results = model.predict(source=frame, conf=0.35, imgsz=640, device="cpu", verbose=False)`
- **Thread**: Inference is synchronous, but `main.py` offloads it to a thread pool via `run_in_executor(None, detect, frame)` to prevent blocking the FastAPI server.

## 6. Detection Pipeline
- **Object**: `detector.py` maps the raw `results[0].boxes` into a list of dictionaries.
- **Format**: 
  ```json
  {
      "class_id": 0,
      "class_name": "Stain",
      "confidence": 0.753,
      "bbox": {"x1": 100, "y1": 100, "x2": 200, "y2": 200}
  }
  ```

## 7. Tracking System
- **File**: `backend/main.py` (`match_track` function)
- **Mechanism**: The backend maintains a `state.active_tracks` dictionary. 
- **Matching Logic**:
  1. Filters tracks by exact `class_id` match.
  2. Calculates Intersection over Union (IoU) between the new bbox and existing tracked bboxes.
  3. If IoU >= `0.3`, it matches.
  4. Fallback: If IoU fails, it checks the center-point distance. If distance <= `150` pixels, it matches.
- **Lifecycle**: If a track is not updated for `track_timeout` (currently `2.0` seconds), it is permanently deleted from memory.

## 8. Defect Event System
- **New Event**: When `match_track` returns `None` (no existing track matches), the backend generates a new `track_id`.
- **Trigger Condition**: 
  1. The class name changed (e.g., YOLO flickers from "Stain" to "hole").
  2. The bounding box moved drastically (>150 pixels) or changed size so much that IoU < 0.3.
  3. The defect disappeared for > 2.0s and reappeared.
- **Result**: `new_events.append(...)` is populated, which is broadcasted exactly once to React.

## 9. Backend Architecture
- **Single Pipeline**: The `async_background_loop` acts as the single source of truth. It reads the frame, runs inference, draws the bounding box on the frame using OpenCV (`cv2.rectangle`), and updates the tracking state simultaneously.

## 10. WebSocket Architecture
- **Endpoint**: `/ws/detections`
- **Frequency**: Throttled by `ws_throttle = 0.1` (max 10 messages per second).
- **Payload**:
  ```json
  {
    "timestamp": "2026-08-20...",
    "loom_id": "LOOM-01",
    "current_detections": [ { "track_id": 1, "confidence": 0.83, ... } ],
    "new_events": [ { ... } ],
    "stats": { "total_defects": 27, "major_defects": 6, ... }
  }
  ```

## 11. React Architecture
- **File**: `app/src/context/SimulationContext.jsx`
- **Flow**: WebSocket -> `onmessage` -> `JSON.parse` -> State Updates.
- **Behavior**: React ONLY appends to the Recent Defects table when `payload.new_events` has items. It continuously updates the confidence and severity of existing rows using `payload.current_detections` matched via `track_id`.

## 12. Dashboard Data Sources
| Dashboard Value | Source |
|---|---|
| Total Defects | REAL (Backend `state.total_defects`) |
| Major Defects | REAL (Backend `state.major_defects`) |
| Current Defect | REAL (Derived from max confidence in `payload.current_detections`) |
| Recent Defects | REAL (Cumulative list of `new_events`) |
| AI Engine Status | CALCULATED (Frontend WebSocket connection status) |
| Current Roll | REAL / FALLBACK (`backendStatus.roll_id` or `—`) |
| Fabric Speed | UNAVAILABLE (Shows `—`) |

## 13. Defect Counting Logic
- **Total Defects (`state.total_defects`)**: Incremented by 1 ONLY when `match_track` returns `None` and a new `track_id` is born.
- **Major Defects (`state.major_defects`)**: Incremented by 1 when a new track is born with >= 0.80 confidence, OR when an existing track's max confidence crosses 0.80 for the first time.

## 14. Why 27 Defects Can Appear
**ROOT CAUSE OF DUPLICATE DEFECT COUNT**
The tracking algorithm strictly requires `track["class_id"] == d["class_id"]`. If the YOLO model is uncertain and flickers classification between consecutive frames (e.g., Frame 1: "Stain", Frame 2: "hole", Frame 3: "Stain"), the tracking algorithm treats these as completely different physical objects. 
1. "Stain" is created -> Total Defects = 1.
2. "hole" is detected. It fails to match the "Stain" track because of class mismatch. "hole" track is created -> Total Defects = 2.
3. This flickering can rapidly generate dozens of new tracks (and therefore dozens of `total_defects` increments) for the exact same physical anomaly, leading to a massive overcount (e.g., 27).

## 15. End-to-End Data Flow

```text
CAMERA (cv2.VideoCapture)
       ↓ (Raw Frame)
FRAME CAPTURE (camera.read)
       ↓ (Frame Array)
YOLO26s INFERENCE (detector.py)
       ↓ (Bounding Boxes, Classes)
TRACKING (main.py: match_track)
       ↓ (IoU / Distance Matching)
EVENT CREATION (main.py)
       ↓ (New track_id generated if no match)
STATISTICS (main.py)
       ↓ (total_defects += 1)
WEBSOCKET (manager.broadcast)
       ↓ (JSON Payload)
REACT STATE (SimulationContext)
       ↓ (setCurrentDefect, setStats)
DASHBOARD (LiveInspection.jsx)
```
- **Duplicate Inference Pipeline**: NO. The system elegantly uses a single YOLO inference call to drive both the MJPEG video stream (via `latest_frame_bytes`) and the WebSocket data.

## 16. Current Architecture Diagram
*See End-to-End Data Flow.* The current architecture correctly follows a unified backend-driven state.

## 17. Problems Found
| Issue | Severity | Cause |
|---|---|---|
| **Class Flickering duplicates counts** | **CRITICAL** | `match_track` demands strict class matching. If YOLO fluctuates classes, new events are spammed. |
| **ZeroDivisionError Risk** | **CRITICAL** | `calculate_iou` lacks protection against 0-area bounding boxes (though user reverted patch). |
| **No FPS Throttling** | **MEDIUM** | Fast cameras might flood the CPU with YOLO inferences if `detect()` is faster than expected. |

## 18. Recommended Architecture
Camera -> Capture -> YOLO -> **Class-Agnostic Spatial Tracker** -> Classification Smoothing (Majority Vote) -> Event Generation -> WebSocket -> React.

*Why this solves it:* By tracking the spatial bounding box *first* (regardless of what YOLO thinks the class is), a single physical anomaly remains 1 track. The class can be decided by taking the most frequent or highest-confidence classification observed during the track's lifespan.

## 19. Recommended Fix Plan
1. **Remove Class Strictness**: Modify `match_track` to match purely based on IoU and Distance, ignoring `class_id`.
2. **Dynamic Classification**: Allow a track to update its `class_name` to whatever class currently has the highest confidence.
3. **Re-apply Math Fixes**: Re-apply the `ZeroDivisionError` prevention in `calculate_iou` to prevent silent backend crashes.
4. **Re-apply Try/Except**: Ensure the background loop is wrapped in a `try/except` block to prevent terminal failure.

## 20. Files Responsible for Each Stage
| Stage | File | Function | Input | Output | Current Problem |
|---|---|---|---|---|---|
| Camera | `camera.py` | `get_camera` | Video Device | `cv2.VideoCapture` | None |
| YOLO | `detector.py` | `detect` | Image Array | `list[dict]` | Flickering classifications |
| Tracking | `main.py` | `match_track` | Detection, Tracks | `dict` or `None` | Strict class matching causes duplication |
| Event | `main.py` | Loop body | Track Data | JSON Payload | Spams new events on class flicker |
| WebSocket | `main.py` | `broadcast` | JSON | Network Bytes | Uncaught exceptions silently pass |
| React | `SimulationContext.jsx`| `onmessage` | Network Bytes | React State | Displays whatever backend sends |

## 21. Limitations
The current YOLO26s model appears highly sensitive to slight visual changes, leading to classification volatility. The backend tracking logic is too brittle to handle this volatility, exposing the raw model noise directly to the dashboard's analytics counters.

## 22. Conclusion
The FABRIC AI dashboard is currently functioning exactly as programmed. The React dashboard is fully reliant on real data from the backend. The "27 defects" anomaly is purely a byproduct of the backend tracking algorithm rigidly interpreting YOLO class fluctuations as entirely new, distinct physical objects. Loosening the tracking constraints to be class-agnostic will immediately resolve this issue.
