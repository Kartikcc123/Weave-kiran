import cv2

for i in range(10):
    cap = cv2.VideoCapture(i)

    if cap.isOpened():
        ret, frame = cap.read()

        if ret:
            print(f"Camera index {i}: AVAILABLE")
            print("Resolution:", frame.shape[1], "x", frame.shape[0])

        cap.release()
    else:
        print(f"Camera index {i}: not available")