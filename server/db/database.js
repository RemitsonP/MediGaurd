const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'medigaurd.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'pharmacist' CHECK(role IN ('admin','pharmacist','auditor')),
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now')),
    lastLogin TEXT
  );

  CREATE TABLE IF NOT EXISTS sensors_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    temperature REAL NOT NULL,
    humidity REAL NOT NULL,
    doorStatus INTEGER DEFAULT 0,
    batteryLevel REAL DEFAULT 100,
    wifiStrength REAL DEFAULT -40
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    alertType TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')),
    message TEXT NOT NULL,
    resolvedStatus INTEGER DEFAULT 0,
    resolvedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    spoilageIndex REAL NOT NULL,
    riskScore REAL NOT NULL,
    forecastValues TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS events_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    eventType TEXT NOT NULL,
    details TEXT
  );

  CREATE TABLE IF NOT EXISTS device_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lastSeen TEXT DEFAULT (datetime('now')),
    uptime REAL DEFAULT 0,
    signalStrength REAL DEFAULT -40,
    batteryLevel REAL DEFAULT 100,
    firmwareVersion TEXT DEFAULT '1.0.0',
    status TEXT DEFAULT 'online'
  );

  CREATE TABLE IF NOT EXISTS medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    minTemp REAL NOT NULL,
    maxTemp REAL NOT NULL,
    minHumidity REAL DEFAULT 20,
    maxHumidity REAL DEFAULT 60,
    spoilageRiskLevel TEXT DEFAULT 'medium' CHECK(spoilageRiskLevel IN ('low','medium','high','critical')),
    quantity INTEGER DEFAULT 0,
    shelfNumber INTEGER DEFAULT 1,
    notes TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS compliance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    dailyScore REAL DEFAULT 100,
    weeklyScore REAL,
    safeHours REAL DEFAULT 24,
    totalHours REAL DEFAULT 24,
    status TEXT DEFAULT 'compliant' CHECK(status IN ('compliant','warning','non-compliant')),
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('weekly','monthly','custom')),
    generatedAt TEXT DEFAULT (datetime('now')),
    filePath TEXT,
    generatedBy INTEGER,
    FOREIGN KEY (generatedBy) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_sensors_timestamp ON sensors_data(timestamp);
  CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events_log(timestamp);
  CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions(timestamp);
  CREATE INDEX IF NOT EXISTS idx_compliance_date ON compliance_records(date);
`);

module.exports = db;
