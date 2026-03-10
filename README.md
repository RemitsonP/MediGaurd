# MediGuard — Medicine & Vaccine Storage Monitoring System

A full-stack web application for monitoring medicine and vaccine cold-chain storage with real-time sensor data, predictive analytics, compliance scoring, and role-based dashboards.

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### 1. Install & Start Backend
```bash
cd server
npm install
node db/seed.js    # Seeds database with demo data
node server.js     # Starts on http://localhost:5000
```

### 2. Install & Start Frontend
```bash
cd client
npm install
npx vite --port 5174    # Starts on http://localhost:5174
```

### 3. Login
Open `http://localhost:5174` and use:

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Pharmacist | pharmacist | pharma123 |
| Auditor | auditor | audit123 |

---

## Features

### Dashboard
- Real-time temperature & humidity display
- Risk Score Gauge (0-100)
- Predictive Spoilage Index
- 12-hour temperature forecast
- Digital Twin cabinet visualization
- Cold Chain Stability Timeline
- Live Event Feed (door opens, alerts, spikes)

### Analytics
- 24h / 7d / 30d trend charts
- Anomaly Detection with Z-score bands (±2σ)
- Spoilage prediction history
- Medicine Spoilage Risk Map

### Alerts
- Active alert management with resolve actions
- Severity filtering (critical, high, medium, low)
- Auto-generated alerts for threshold violations
- Door-left-open detection

### Compliance
- Daily & weekly compliance scores
- Animated ring gauges
- Status distribution pie chart
- Historical compliance records

### Device Health
- ESP8266 status (online/offline)
- Battery level tracking
- WiFi signal strength monitoring
- Uptime tracking

### Reports
- Weekly & monthly PDF generation
- Downloadable report archive
- Auto-schedule configuration

### Admin Panel
- User management (CRUD)
- Role assignment (Admin/Pharmacist/Auditor)
- Medicine database management

### UI Features
- Night Mode / Light Mode toggle
- Emergency Mode (auto-triggers red theme when extreme values)
- Responsive design
- Glassmorphism sidebar
- Animated transitions

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sensor/upload` | Receive sensor data from ESP8266 |
| GET | `/api/sensor/latest` | Get latest sensor reading |
| GET | `/api/sensor/history?range=24h\|7d\|30d` | Historical sensor data |
| POST | `/api/alerts/generate` | Trigger alert evaluation |
| GET | `/api/alerts/history` | List alerts |
| PUT | `/api/alerts/:id/resolve` | Resolve an alert |
| GET | `/api/prediction/spoilage` | Spoilage index + forecast |
| GET | `/api/device/health` | Device status |
| GET | `/api/medicines/list` | List all medicines |
| POST | `/api/medicines` | Add medicine (admin) |
| PUT | `/api/medicines/:id` | Update medicine (admin) |
| DELETE | `/api/medicines/:id` | Delete medicine (admin) |
| POST | `/api/reports/generate` | Generate PDF report |
| GET | `/api/reports/list` | List reports |
| GET | `/api/reports/download/:id` | Download PDF |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register user |
| GET | `/api/auth/roles` | List roles (admin) |
| GET | `/api/auth/users` | List users (admin) |
| GET | `/api/reports/compliance` | Compliance scores |
| GET | `/api/reports/events` | Event log |

---

## Database Schema

| Table | Key Columns |
|-------|-------------|
| `users` | username, email, passwordHash, role |
| `sensors_data` | timestamp, temperature, humidity, doorStatus, batteryLevel, wifiStrength |
| `alerts` | alertType, severity, message, resolvedStatus |
| `predictions` | spoilageIndex, riskScore, forecastValues |
| `events_log` | eventType, details |
| `device_health` | lastSeen, uptime, signalStrength, batteryLevel |
| `medicines` | name, category, minTemp, maxTemp, spoilageRiskLevel |
| `compliance_records` | dailyScore, weeklyScore, safeHours, status |
| `reports` | type, generatedAt, filePath |

---

## Hardware Connection (ESP8266)

### Wiring
```
ESP8266 NodeMCU
├── DHT22 Sensor → GPIO4 (D2) — Temperature & Humidity
├── IR Sensor    → GPIO5 (D1) — Door open/close detection
├── Battery ADC  → A0         — Battery level monitoring
└── Power        → 3.3V / GND
```

### Arduino Code for ESP8266
```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_SERVER_IP:5000/api/sensor/upload";

#define DHT_PIN 4
#define IR_PIN 5
DHT dht(DHT_PIN, DHT22);

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(IR_PIN, INPUT);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nConnected!");
}

void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int doorStatus = digitalRead(IR_PIN);
  float battery = analogRead(A0) * 100.0 / 1024.0;
  int wifi = WiFi.RSSI();

  if (!isnan(temperature) && !isnan(humidity)) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<200> doc;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["doorStatus"] = doorStatus;
    doc["batteryLevel"] = battery;
    doc["wifiStrength"] = wifi;

    String payload;
    serializeJson(doc, payload);
    int code = http.POST(payload);
    Serial.printf("Response: %d\\n", code);
    http.end();
  }

  delay(30000); // Send every 30 seconds
}
```

### JSON Payload Format
```json
{
  "temperature": 4.5,
  "humidity": 45.2,
  "doorStatus": 0,
  "batteryLevel": 87.5,
  "wifiStrength": -42
}
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Recharts, Socket.IO Client |
| Backend | Node.js, Express, Socket.IO |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcryptjs |
| PDF | PDFKit |
| Styling | Custom CSS (dark/light/emergency themes) |

---

## Production Build

```bash
# Build frontend
cd client
npm run build

# Serve with backend (copy dist to server/public)
cp -r dist ../server/public

# Start production server
cd ../server
NODE_ENV=production node server.js
```

## License
MIT
