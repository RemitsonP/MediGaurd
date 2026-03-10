const express = require('express');
const db = require('../db/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { generateReport } = require('../services/reportGenerator');

const router = express.Router();

// POST /api/reports/generate
router.post('/generate', authenticateToken, authorizeRoles('admin', 'auditor'), (req, res) => {
  try {
    const type = req.body.type || 'weekly';
    const filePath = generateReport(type, req.user.id);
    res.json({ message: 'Report generated', filePath, type });
  } catch (err) {
    res.status(500).json({ error: 'Report generation failed', details: err.message });
  }
});

// GET /api/reports/list
router.get('/list', authenticateToken, (req, res) => {
  try {
    const reports = db.prepare('SELECT * FROM reports ORDER BY generatedAt DESC LIMIT 50').all();
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/reports/download/:id
router.get('/download/:id', authenticateToken, (req, res) => {
  try {
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!report || !report.filePath) {
      return res.status(404).json({ error: 'Report not found' });
    }
    const path = require('path');
    const absPath = path.join(__dirname, '..', report.filePath);
    res.download(absPath, `medigaurd_${report.type}_report_${report.id}.pdf`);
  } catch (err) {
    res.status(500).json({ error: 'Download failed' });
  }
});

// GET /api/compliance/scores
router.get('/compliance', authenticateToken, (req, res) => {
  try {
    const records = db.prepare('SELECT * FROM compliance_records ORDER BY date DESC LIMIT 30').all();
    const latest = records[0];
    const weeklyAvg = records.slice(0, 7).reduce((sum, r) => sum + (r.dailyScore || 0), 0) / Math.min(records.length, 7);
    res.json({ records, latestScore: latest?.dailyScore || 100, weeklyAverage: Math.round(weeklyAvg * 10) / 10 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch compliance data' });
  }
});

// GET /api/events
router.get('/events', authenticateToken, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const events = db.prepare('SELECT * FROM events_log ORDER BY timestamp DESC LIMIT ?').all(limit);
    events.forEach(e => { try { e.details = JSON.parse(e.details); } catch {} });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

module.exports = router;
