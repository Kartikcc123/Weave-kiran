import cv2
from ultralytics import YOLO

# Load trained model
model = YOLO("best.pt")

# DroidCam = camera index 1
cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)

# Set camera resolution
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

if not cap.isOpened():
    print("❌ DroidCam open nahi hua!")
    exit()

print("✅ DroidCam connected")
print("✅ YOLO26s loaded")
print("Press Q to quit")

while True:

    ret, frame = cap.read()

    if not ret:
        print("❌ Frame read nahi hua")
        break

    # YOLO inference
    results = model.predict(
        source=frame,
        conf=0.35,
        imgsz=640,
        device="cpu",
        verbose=False
    )

    # Draw detections
    annotated_frame = results[0].plot()

    # Display
    cv2.imshow(
        "FABRIC AI - Live Inspection",
        annotated_frame
    )

    # Q = quit
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()