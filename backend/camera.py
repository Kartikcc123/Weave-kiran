import cv2

import os
from dotenv import load_dotenv

load_dotenv()

# Change this in your .env file to switch cameras (e.g., 0, 1, 2)
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", 1))

def init_camera():
    print(f"[CAMERA] Attempting to open camera at index {CAMERA_INDEX}...")
    cam = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
    if not cam.isOpened():
        cam = cv2.VideoCapture(CAMERA_INDEX)
        
    if cam.isOpened():
        print(f"[CAMERA] Successfully opened camera at index {CAMERA_INDEX}")
        cam.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        return cam
        
    print(f"[ERROR] Could not open camera {CAMERA_INDEX}.")
    return None

camera = init_camera()

def get_camera():
    return camera