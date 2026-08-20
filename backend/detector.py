from ultralytics import YOLO

MODEL_PATH = r"D:\fabric-ai\best.pt"

model = YOLO(MODEL_PATH)

CLASS_NAMES = model.names


def detect(frame, confidence=0.35):
    results = model.predict(
        source=frame,
        conf=confidence,
        imgsz=640,
        device="cpu",
        verbose=False
    )

    result = results[0]

    detections = []

    for box in result.boxes:
        class_id = int(box.cls[0])
        conf = float(box.conf[0])

        x1, y1, x2, y2 = map(
            int,
            box.xyxy[0].tolist()
        )

        detections.append({
            "class_id": class_id,
            "class_name": CLASS_NAMES[class_id],
            "confidence": round(conf, 3),
            "bbox": {
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2
            }
        })

    return detections