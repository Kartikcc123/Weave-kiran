# 🧵 FABRIC AI (Weave-Kiran)
### *Next-Gen Real-Time Fabric Defect Detection & Loom Automation System*

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![YOLO](https://img.shields.io/badge/YOLO-Detection-00FFFF?style=for-the-badge&logo=yolo&logoColor=black)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Arduino](https://img.shields.io/badge/Arduino-Uno-00979D?style=for-the-badge&logo=arduino&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Docker-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

<p align="center">
  <b>High-speed computer vision pipeline for automated fabric defect monitoring with hardware buzzer alerts, speed tracking, and real-time live telemetry.</b>
</p>

</div>

---

## 🌟 Key Highlights

- ⚡ **Real-Time Edge AI Vision**: Custom-trained YOLO model detecting defects (`Stain`, `Thread`, `Warp_Weft`, `hole`, `seam`) with ultra-low latency.
- 🎯 **Smart Anti-Flicker Spatial Tracking**: Tracks physical defect bounding boxes across frames using IoU & distance matching—preventing duplicate defect counting caused by classification fluctuations.
- 🔔 **Hardware Integration (Arduino Uno)**:
  - 🔊 **Auto Beep**: Active buzzer alerts on `MEDIUM` (1 beep) and `HIGH` (2 beeps) severity defects with auto-cooldown.
  - 📏 **Fabric Telemetry**: Hardware interrupt pulse sensor calculates real-time fabric speed (`m/min`) and total inspection length (`m`).
- 📊 **Dynamic React Dashboard**: Live MJPEG video stream, real-time WebSocket telemetry, historical defect logs, and severity breakdown charts.
- 💾 **Automated Defect Logging**: Defect instances, timestamps, bounding boxes, and fabric meter positions are persisted in MongoDB.

---

## 🏗️ System Architecture

```text
 ┌─────────────────┐       ┌────────────────────────┐       ┌──────────────────────┐
 │  Camera (Video) │ ───►  │  YOLO Inference Engine │ ───►  │ Spatial Object Track │
 └─────────────────┘       └────────────────────────┘       └──────────┬───────────┘
                                                                       │ (New Event / Update)
 ┌─────────────────┐       ┌────────────────────────┐                  ▼
 │   Arduino Uno   │ ◄───► │    FastAPI Backend     │ ◄────────────────┼────────────────┐
 │ (Buzzer/Sensor) │       │   (WebSocket + REST)   │                  │                │
 └─────────────────┘       └──────────┬─────────────┘                  │                │
                                      │                                ▼                ▼
                         ┌────────────┴────────────┐            ┌─────────────┐  ┌─────────────┐
                         │   React Live Dashboard  │            │ MongoDB Log │  │ Alert Logic │
                         │ (Telemetry / Video Feed)│            └─────────────┘  └─────────────┘
                         └─────────────────────────┘
```

---

## 📂 Project Structure

```text
Weave-kiran/
│
├── 🧠 best.pt                       # Trained YOLO weights (Stain, Thread, Warp_Weft, hole, seam)
│
├── ⚙️ backend/                       # Core FastAPI Server & Vision Engine
│   ├── main.py                     # WebSocket manager, tracking algorithm & REST endpoints
│   ├── detector.py                 # YOLO inference execution
│   ├── camera.py                   # OpenCV video capture stream
│   ├── database.py                 # Motor / MongoDB async client
│   └── arduino.py                  # Auto-detecting USB Serial link & telemetry parser
│
├── 🖥️ app/                           # Vite + React Dashboard
│   ├── src/
│   │   ├── components/             # LiveInspection, ProductionStatus, RecentDefects, etc.
│   │   ├── context/                # SimulationContext (WebSocket state provider)
│   │   └── config.js               # Dynamic API / WebSocket endpoint config
│   └── package.json
│
├── 🔌 arduino/                      # Microcontroller Firmware
│   └── fabric_monitor/
│       └── fabric_monitor.ino      # Interrupt-based pulse counter & non-blocking buzzer driver
│
└── 📄 requirements.txt             # Python backend dependencies
```

---

## 🚀 Quick Start Guide

### 1️⃣ Prerequisites
- **Python 3.10+**
- **Node.js 18+** & npm
- **Docker Desktop** (for MongoDB)
- **Arduino IDE** (to flash the Uno board)

---

### 2️⃣ Database Setup (MongoDB)
Start the MongoDB container with persistent storage:
```bash
docker run -d --name fabric-mongo -p 27017:27017 -v fabric-mongo-data:/data/db --restart unless-stopped mongo:7
```

---

### 3️⃣ Backend Setup
```bash
# Clone the repository
git clone https://github.com/Kartikcc123/Weave-kiran.git
cd Weave-kiran

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # On Windows (PowerShell)

# Install dependencies
pip install -r requirements.txt

# Start backend server
cd backend
uvicorn main:app --host 127.0.0.1 --port 8000
```
> **Backend Endpoints:**
> - 🌐 Web API: `http://127.0.0.1:8000`
> - 📹 Live Stream: `http://127.0.0.1:8000/video`
> - ⚡ WebSocket: `ws://127.0.0.1:8000/ws/detections`

---

### 4️⃣ Frontend Dashboard Setup
In a new terminal:
```bash
cd Weave-kiran/app
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser to view the live dashboard.

---

## ⚡ Arduino Uno Hardware Wiring

| Component | Arduino Pin | Notes |
|---|---|---|
| **Active 5V Buzzer (+)** | **Pin 8** | Negative (-) to Arduino `GND` |
| **Roller Pulse Sensor (OUT)** | **Pin 2** | Hardware Interrupt pin for high-accuracy speed tracking |
| **Sensor VCC / GND** | **5V / GND** | Standard 5V power line |

1. Open `arduino/fabric_monitor/fabric_monitor.ino` in Arduino IDE.
2. Adjust `ROLLER_CIRCUMFERENCE_M` and `PULSES_PER_REV` for your specific loom roller.
3. Flash the code to the Arduino Uno.
4. Close the Serial Monitor and plug into the host PC USB port. The backend will auto-detect and pair.

---

## 🌐 Remote Factory Deployment (300 km Remote Access)

To monitor the loom from anywhere without port forwarding:
1. **Local Factory Unit**: Connect Camera & Arduino to the factory PC running the backend.
2. **Expose with Cloudflare Tunnel (Free & Secure)**:
   ```bash
   # Download cloudflared on the factory PC
   cloudflared tunnel --url http://localhost:8000
   ```
3. Copy the generated `https://*.trycloudflare.com` URL to view live feed and telemetry on your phone or laptop from anywhere in the world!

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <sub>Crafted with precision for smart textile manufacturing & quality assurance.</sub>
</div>
