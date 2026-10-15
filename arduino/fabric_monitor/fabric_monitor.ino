/*
 * FABRIC AI - Arduino Uno sketch
 * --------------------------------------------------------------
 * 1) Buzzer: beeps when the PC (backend) reports a defect
 *      "B1\n" -> MEDIUM defect : 1 short beep
 *      "B2\n" -> HIGH defect   : 2 beeps
 * 2) Fabric sensor: counts pulses from a sensor on a fabric roller
 *    (IR / proximity / hall sensor or encoder) and sends meters + speed:
 *      "DATA,<meters>,<speed_m_per_min>\n"   every 1 second
 *
 * WIRING (Arduino Uno)
 *   Buzzer (+) -> Pin 8      Buzzer (-) -> GND     (active 5V buzzer)
 *   Sensor OUT -> Pin 2      Sensor VCC -> 5V      Sensor GND -> GND
 *   (Pin 2 = interrupt pin, required for accurate counting)
 *
 * IMPORTANT: Close the Arduino IDE Serial Monitor before starting the
 * backend - only one program can use the COM port at a time.
 */

// ---------------- CONFIG: set these for your loom ----------------
const float ROLLER_CIRCUMFERENCE_M = 0.314;  // roller circumference in meters (pi * diameter). 10 cm dia = 0.314 m
const int   PULSES_PER_REV         = 1;      // pulses per roller rotation (marks / magnets / encoder PPR)
const unsigned long DEBOUNCE_US    = 2000;   // ignore pulses closer than 2 ms (sensor noise)
const unsigned long REPORT_MS      = 1000;   // send DATA every 1 second
// ------------------------------------------------------------------

const int BUZZER_PIN = 8;
const int SENSOR_PIN = 2;
const float METERS_PER_PULSE = ROLLER_CIRCUMFERENCE_M / PULSES_PER_REV;

volatile unsigned long pulseCount = 0;
volatile unsigned long lastPulseUs = 0;

unsigned long lastReportMs = 0;
unsigned long lastReportPulses = 0;

// Non-blocking beep state (so pulse counting / reporting never pauses)
int beepsRemaining = 0;
bool buzzerOn = false;
unsigned long beepTimer = 0;
const unsigned long BEEP_ON_MS = 150;
const unsigned long BEEP_OFF_MS = 120;

String inputLine = "";

void onPulse() {
  unsigned long now = micros();
  if (now - lastPulseUs >= DEBOUNCE_US) {
    pulseCount++;
    lastPulseUs = now;
  }
}

void startBeep(int count) {
  // A new alert never stacks forever: it replaces any pending pattern
  beepsRemaining = count;
  buzzerOn = false;
  beepTimer = 0;
}

void updateBuzzer() {
  unsigned long now = millis();
  if (buzzerOn) {
    if (now - beepTimer >= BEEP_ON_MS) {
      digitalWrite(BUZZER_PIN, LOW);
      buzzerOn = false;
      beepTimer = now;
    }
  } else if (beepsRemaining > 0) {
    if (beepTimer == 0 || now - beepTimer >= BEEP_OFF_MS) {
      digitalWrite(BUZZER_PIN, HIGH);
      buzzerOn = true;
      beepTimer = now;
      beepsRemaining--;
    }
  }
}

void handleCommand(String cmd) {
  cmd.trim();
  if (cmd == "B1") {
    startBeep(1);
  } else if (cmd == "B2") {
    startBeep(2);
  } else if (cmd == "RESET") {
    noInterrupts();
    pulseCount = 0;
    interrupts();
    lastReportPulses = 0;
    Serial.println("OK RESET");
  } else if (cmd == "PING") {
    Serial.println("PONG");
  }
}

void readSerial() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      handleCommand(inputLine);
      inputLine = "";
    } else if (c != '\r' && inputLine.length() < 32) {
      inputLine += c;
    }
  }
}

void sendReport() {
  unsigned long now = millis();
  if (now - lastReportMs < REPORT_MS) return;

  noInterrupts();
  unsigned long pulses = pulseCount;
  interrupts();

  float meters = pulses * METERS_PER_PULSE;
  float intervalMin = (now - lastReportMs) / 60000.0;
  float speed = ((pulses - lastReportPulses) * METERS_PER_PULSE) / intervalMin;

  Serial.print("DATA,");
  Serial.print(meters, 2);
  Serial.print(",");
  Serial.println(speed, 2);

  lastReportMs = now;
  lastReportPulses = pulses;
}

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  pinMode(SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(SENSOR_PIN), onPulse, FALLING);

  Serial.begin(9600);
  lastReportMs = millis();
  Serial.println("READY");

  startBeep(1); // startup beep = buzzer working
}

void loop() {
  readSerial();
  updateBuzzer();
  sendReport();
}
