const db = require('../db/database');

function evaluateAlerts() {
  const latest = db.prepare('SELECT * FROM sensors_data ORDER BY id DESC LIMIT 1').get();
  if (!latest) return [];

  const newAlerts = [];

  // Temperature alerts
  if (latest.temperature > 8) {
    const severity = latest.temperature > 12 ? 'critical' : 'high';
    newAlerts.push(createAlert('temperature_high', severity, 
      `Temperature alert: ${latest.temperature}°C exceeds safe range (2-8°C)`));
  }
  if (latest.temperature < 2) {
    const severity = latest.temperature < 0 ? 'critical' : 'medium';
    newAlerts.push(createAlert('temperature_low', severity,
      `Temperature alert: ${latest.temperature}°C below safe range (2-8°C)`));
  }

  // Humidity alerts
  if (latest.humidity > 65) {
    newAlerts.push(createAlert('humidity_high', 'medium',
      `Humidity alert: ${latest.humidity}% exceeds recommended range`));
  }
  if (latest.humidity < 15) {
    newAlerts.push(createAlert('humidity_low', 'medium',
      `Humidity alert: ${latest.humidity}% below recommended range`));
  }

  // Battery alert
  if (latest.batteryLevel < 20) {
    const severity = latest.batteryLevel < 10 ? 'critical' : 'high';
    newAlerts.push(createAlert('battery_low', severity,
      `Battery level critical: ${latest.batteryLevel}%`));
  }

  // WiFi signal alert
  if (latest.wifiStrength < -70) {
    newAlerts.push(createAlert('wifi_weak', 'medium',
      `WiFi signal weak: ${latest.wifiStrength}dBm`));
  }

  // Door left open detection using recent data
  const recentDoor = db.prepare(`
    SELECT * FROM sensors_data 
    WHERE timestamp >= datetime('now', '-30 minutes') AND doorStatus = 1
    ORDER BY timestamp ASC
  `).all();
  if (recentDoor.length >= 3) {
    newAlerts.push(createAlert('door_left_open', 'high',
      `Door may be left open: ${recentDoor.length} consecutive open readings in last 30 minutes`));
  }

  // Z-score anomaly detection
  const stats = db.prepare(`
    SELECT AVG(temperature) as avgTemp, 
           AVG((temperature - (SELECT AVG(temperature) FROM sensors_data WHERE timestamp >= datetime('now', '-6 hours'))) * 
               (temperature - (SELECT AVG(temperature) FROM sensors_data WHERE timestamp >= datetime('now', '-6 hours')))) as varTemp
    FROM sensors_data WHERE timestamp >= datetime('now', '-6 hours')
  `).get();
  
  if (stats && stats.varTemp) {
    const stdDev = Math.sqrt(stats.varTemp);
    if (stdDev > 0) {
      const zScore = Math.abs((latest.temperature - stats.avgTemp) / stdDev);
      if (zScore > 2.5) {
        newAlerts.push(createAlert('anomaly_detected', 'high',
          `Temperature anomaly detected: Z-score ${zScore.toFixed(2)} (temperature: ${latest.temperature}°C)`));
      }
    }
  }

  return newAlerts;
}

function createAlert(alertType, severity, message) {
  const result = db.prepare(
    'INSERT INTO alerts (alertType, severity, message) VALUES (?, ?, ?)'
  ).run(alertType, severity, message);

  db.prepare("INSERT INTO events_log (eventType, details) VALUES ('alert', ?)")
    .run(JSON.stringify({ alertType, severity, message }));

  return { id: result.lastInsertRowid, alertType, severity, message, timestamp: new Date().toISOString() };
}

module.exports = { evaluateAlerts };
