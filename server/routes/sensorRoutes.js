const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/sensor/upload — receive sensor data from ESP8266
router.post('/upload', (req, res) => {
  try {
    const { temperature, humidity, doorStatus, batteryLevel, wifiStrength } = req.body;

    if (temperature === undefined || humidity === undefined) {
      return res.status(400).json({ error: 'Temperature and humidity are required' });
    }

    const result = db.prepare(
      'INSERT INTO sensors_data (temperature, humidity, doorStatus, batteryLevel, wifiStrength) VALUES (?, ?, ?, ?, ?)'
    ).run(
      parseFloat(temperature),
      parseFloat(humidity),
      doorStatus ? 1 : 0,
      batteryLevel !== undefined ? parseFloat(batteryLevel) : 100,
      wifiStrength !== undefined ? parseFloat(wifiStrength) : -40
    );

    // Update device health
    db.prepare(`
      UPDATE device_health SET lastSeen = datetime('now'), batteryLevel = ?, signalStrength = ?, status = 'online'
      WHERE id = 1
    `).run(batteryLevel || 100, wifiStrength || -40);

    // Log door events
    if (doorStatus) {
      db.prepare("INSERT INTO events_log (eventType, details) VALUES ('door_open', ?)")
        .run(JSON.stringify({ temperature, humidity }));
    }

    // Emit via socket if available
    if (req.app.io) {
      const latest = db.prepare('SELECT * FROM sensors_data ORDER BY id DESC LIMIT 1').get();
      req.app.io.emit('sensorUpdate', latest);
    }

    res.status(201).json({ message: 'Data received', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to store sensor data', details: err.message });
  }
});

// GET /api/sensor/latest
router.get('/latest', authenticateToken, (req, res) => {
  try {
    const latest = db.prepare('SELECT * FROM sensors_data ORDER BY id DESC LIMIT 1').get();
    res.json({ data: latest || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch latest data' });
  }
});

// GET /api/sensor/history?range=24h|7d|30d&limit=500
router.get('/history', authenticateToken, (req, res) => {
  try {
    const range = req.query.range || '24h';
    const limit = Math.min(parseInt(req.query.limit) || 500, 5000);
    let hoursBack = 24;
    if (range === '7d') hoursBack = 168;
    else if (range === '30d') hoursBack = 720;

    const data = db.prepare(`
      SELECT * FROM sensors_data 
      WHERE timestamp >= datetime('now', '-${hoursBack} hours')
      ORDER BY timestamp ASC 
      LIMIT ?
    `).all(limit);

    res.json({ data, range, count: data.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
