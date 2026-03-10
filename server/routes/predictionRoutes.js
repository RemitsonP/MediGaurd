const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { calculateSpoilageIndex, generateForecast, calculateRiskScore } = require('../services/predictionEngine');

const router = express.Router();

// GET /api/prediction/spoilage
router.get('/spoilage', authenticateToken, (req, res) => {
  try {
    const recentData = db.prepare(`
      SELECT * FROM sensors_data 
      WHERE timestamp >= datetime('now', '-24 hours') 
      ORDER BY timestamp ASC
    `).all();

    if (recentData.length === 0) {
      return res.json({ spoilageIndex: 0, riskScore: 0, forecast: [], message: 'No recent data' });
    }

    const spoilageIndex = calculateSpoilageIndex(recentData);
    const riskScore = calculateRiskScore(recentData);
    const forecast = generateForecast(recentData);

    // Store prediction
    db.prepare('INSERT INTO predictions (spoilageIndex, riskScore, forecastValues) VALUES (?, ?, ?)')
      .run(spoilageIndex, riskScore, JSON.stringify(forecast));

    res.json({ spoilageIndex, riskScore, forecast });
  } catch (err) {
    res.status(500).json({ error: 'Prediction failed', details: err.message });
  }
});

// GET /api/prediction/history
router.get('/history', authenticateToken, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 48;
    const predictions = db.prepare('SELECT * FROM predictions ORDER BY timestamp DESC LIMIT ?').all(limit);
    predictions.forEach(p => { p.forecastValues = JSON.parse(p.forecastValues || '[]'); });
    res.json({ predictions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

module.exports = router;
