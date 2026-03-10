const db = require('../db/database');

function calculateDailyCompliance(date) {
  const data = db.prepare(`
    SELECT * FROM sensors_data 
    WHERE date(timestamp) = ?
    ORDER BY timestamp ASC
  `).all(date);

  if (data.length === 0) return null;

  let safeReadings = 0;
  data.forEach(d => {
    if (d.temperature >= 2 && d.temperature <= 8 && d.humidity >= 20 && d.humidity <= 60) {
      safeReadings++;
    }
  });

  const score = Math.round((safeReadings / data.length) * 100 * 10) / 10;
  const safeHours = Math.round((safeReadings * 5 / 60) * 10) / 10; // assuming 5-min intervals
  const totalHours = Math.round((data.length * 5 / 60) * 10) / 10;
  const status = score >= 95 ? 'compliant' : score >= 80 ? 'warning' : 'non-compliant';

  return { date, dailyScore: score, safeHours, totalHours, status };
}

function calculateWeeklyCompliance() {
  const records = db.prepare('SELECT * FROM compliance_records ORDER BY date DESC LIMIT 7').all();
  if (records.length === 0) return 100;
  const avg = records.reduce((sum, r) => sum + (r.dailyScore || 0), 0) / records.length;
  return Math.round(avg * 10) / 10;
}

function calculateColdChainStability(data) {
  if (!data || data.length < 2) return { stable: true, stability: 100, breaches: 0 };

  let breaches = 0;
  let stableReadings = 0;
  const breachDetails = [];

  for (let i = 1; i < data.length; i++) {
    const tempChange = Math.abs(data[i].temperature - data[i - 1].temperature);
    const inRange = data[i].temperature >= 2 && data[i].temperature <= 8;
    
    if (inRange && tempChange < 2) {
      stableReadings++;
    }
    if (!inRange) {
      breaches++;
      breachDetails.push({
        timestamp: data[i].timestamp,
        temperature: data[i].temperature,
        type: data[i].temperature > 8 ? 'high' : 'low'
      });
    }
  }

  const stability = Math.round((stableReadings / (data.length - 1)) * 100 * 10) / 10;
  return { stable: stability >= 90, stability, breaches, breachDetails: breachDetails.slice(-10) };
}

module.exports = { calculateDailyCompliance, calculateWeeklyCompliance, calculateColdChainStability };
