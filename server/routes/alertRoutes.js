const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { evaluateAlerts } = require('../services/alertEngine');

const router = express.Router();

// POST /api/alerts/generate
router.post('/generate', authenticateToken, (req, res) => {
  try {
    const newAlerts = evaluateAlerts();
    if (req.app.io && newAlerts.length > 0) {
      req.app.io.emit('newAlerts', newAlerts);
    }
    res.json({ message: `${newAlerts.length} alert(s) generated`, alerts: newAlerts });
  } catch (err) {
    res.status(500).json({ error: 'Alert generation failed', details: err.message });
  }
});

// GET /api/alerts/history
router.get('/history', authenticateToken, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const severity = req.query.severity;
    let query = 'SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?';
    let params = [limit];
    if (severity) {
      query = 'SELECT * FROM alerts WHERE severity = ? ORDER BY timestamp DESC LIMIT ?';
      params = [severity, limit];
    }
    const alerts = db.prepare(query).all(...params);
    res.json({ alerts, count: alerts.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// PUT /api/alerts/:id/resolve
router.put('/:id/resolve', authenticateToken, (req, res) => {
  try {
    db.prepare("UPDATE alerts SET resolvedStatus = 1, resolvedAt = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ message: 'Alert resolved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

module.exports = router;
