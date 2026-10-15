"""
Arduino Uno link over USB Serial.

Protocol (newline-terminated text, 9600 baud):
  PC  -> Arduino : "B1"  = MEDIUM defect beep (1 short beep)
                   "B2"  = HIGH defect beep   (2 beeps)
  Arduino -> PC  : "READY"                           (sent once on boot)
                   "DATA,<meters>,<speed_m_per_min>" (sent every 1 second)

The link runs in its own thread, auto-detects the Arduino port (or uses
ARDUINO_PORT from .env), and reconnects automatically if the cable is
unplugged. If no Arduino is connected, the rest of the backend keeps working.
"""
import os
import threading
import time

import serial
import serial.tools.list_ports
from dotenv import load_dotenv

load_dotenv()

ARDUINO_PORT = os.getenv("ARDUINO_PORT", "").strip()      # e.g. COM5 (empty = auto-detect)
ARDUINO_BAUD = int(os.getenv("ARDUINO_BAUD", 9600))
ARDUINO_ENABLED = os.getenv("ARDUINO_ENABLED", "1") != "0"

# USB vendor IDs: Arduino LLC/SA, CH340 clones, FTDI, Silicon Labs CP210x
_KNOWN_VIDS = {0x2341, 0x2A03, 0x1A86, 0x0403, 0x10C4}


def _find_port():
    if ARDUINO_PORT:
        return ARDUINO_PORT
    for p in serial.tools.list_ports.comports():
        desc = (p.description or "").lower()
        if "bluetooth" in desc:
            continue
        if p.vid in _KNOWN_VIDS or "arduino" in desc or "ch340" in desc:
            return p.device
    return None


class ArduinoLink:
    def __init__(self):
        self._ser = None
        self._lock = threading.Lock()
        self._thread = None
        self._running = False

        self.connected = False
        self.port = None
        self.fabric_meters = None      # total fabric inspected (m), from Arduino
        self.fabric_speed = None       # m/min, from Arduino
        self.last_data_time = 0.0

    # ---------- lifecycle ----------
    def start(self):
        if not ARDUINO_ENABLED:
            print("[ARDUINO] Disabled via ARDUINO_ENABLED=0")
            return
        if self._thread and self._thread.is_alive():
            return
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        self._close()

    # ---------- public API ----------
    def beep(self, severity):
        """Send a beep command for a MEDIUM or HIGH defect."""
        cmd = "B2" if severity == "HIGH" else "B1"
        self._send(cmd)

    def status(self):
        fresh = (time.time() - self.last_data_time) < 5
        return {
            "arduino_connected": self.connected,
            "arduino_port": self.port,
            "fabric_speed": self.fabric_speed if fresh else None,
            "fabric_inspected": self.fabric_meters,
        }

    # ---------- internals ----------
    def _send(self, text):
        with self._lock:
            if not self._ser:
                return False
            try:
                self._ser.write((text + "\n").encode())
                print(f"[ARDUINO] -> {text}")
                return True
            except Exception as e:
                print(f"[ARDUINO] Write failed: {e}")
        self._close()
        return False

    def _close(self):
        with self._lock:
            if self._ser:
                try:
                    self._ser.close()
                except Exception:
                    pass
            self._ser = None
        if self.connected:
            print("[ARDUINO] Disconnected")
        self.connected = False

    def _connect(self):
        port = _find_port()
        if not port:
            return False
        try:
            ser = serial.Serial(port, ARDUINO_BAUD, timeout=1)
            time.sleep(2)  # Uno resets when the port opens; wait for bootloader
            ser.reset_input_buffer()
            with self._lock:
                self._ser = ser
            self.port = port
            self.connected = True
            print(f"[ARDUINO] Connected on {port} @ {ARDUINO_BAUD}")
            return True
        except Exception as e:
            print(f"[ARDUINO] Could not open {port}: {e}")
            return False

    def _handle_line(self, line):
        if line.startswith("DATA,"):
            parts = line.split(",")
            if len(parts) >= 3:
                try:
                    self.fabric_meters = round(float(parts[1]), 2)
                    self.fabric_speed = round(float(parts[2]), 2)
                    self.last_data_time = time.time()
                except ValueError:
                    pass
        elif line:
            print(f"[ARDUINO] <- {line}")

    def _run(self):
        warned = False
        while self._running:
            if not self._ser:
                if self._connect():
                    warned = False
                else:
                    if not warned:
                        print("[ARDUINO] Not found - retrying every 3s (backend keeps running)")
                        warned = True
                    time.sleep(3)
                    continue
            try:
                raw = self._ser.readline()
                if raw:
                    self._handle_line(raw.decode(errors="ignore").strip())
            except Exception as e:
                print(f"[ARDUINO] Read failed: {e}")
                self._close()
                time.sleep(1)


arduino = ArduinoLink()
