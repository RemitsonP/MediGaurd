const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/device/health
router.get('/health', authenticateToken, (req, res) => {
  try {
    const device = db.prepare('SELECT * FROM device_health ORDER BY id DESC LIMIT 1').get();
    if (!device) {
      return res.json({ device: { status: 'unknown', lastSeen: null } });
    }
    // Calculate if device is offline (no data in 10 minutes)
    const lastSensor = db.prepare('SELECT timestamp FROM sensors_data ORDER BY id DESC LIMIT 1').get();
    if (lastSensor) {
      const lastTime = new Date(lastSensor.timestamp).getTime();
      const now = Date.now();
      if (now - lastTime > 10 * 60 * 1000) {
        device.status = 'offline';
      }
    }
    res.json({ device });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch device health' });
  }
});

module.exports = router;
