const db = require('../db/database');
const { evaluateAlerts } = require('./alertEngine');

let simulatorInterval = null;

function startSimulator(io, intervalMs = 30000) {
  if (simulatorInterval) clearInterval(simulatorInterval);

  console.log(`Simulator started: sending data every ${intervalMs / 1000}s`);

  simulatorInterval = setInterval(() => {
    const now = new Date();
    const hour = now.getHours();

    // Realistic temperature with daily cycle
    const dailyCycle = Math.sin((hour - 6) * Math.PI / 12) * 1.5;
    const noise = (Math.random() - 0.5) * 0.6;
    let temp = 4.5 + dailyCycle + noise;

    // Occasional spikes (2% chance)
    if (Math.random() > 0.98) {
      temp += (Math.random() * 5 + 2);
    }
    temp = Math.round(temp * 100) / 100;

    const humidity = Math.round((45 + (Math.random() - 0.5) * 12 + dailyCycle * 1.5) * 100) / 100;
    const doorOpen = (hour >= 8 && hour <= 18 && Math.random() > 0.9) ? 1 : 0;

    // Slowly drain battery
    const lastDevice = db.prepare('SELECT batteryLevel FROM device_health ORDER BY id DESC LIMIT 1').get();
    const battery = lastDevice ? Math.max(15, lastDevice.batteryLevel - Math.random() * 0.05) : 95;
    const wifi = Math.round(-35 - Math.random() * 20);

    const tsStr = now.toISOString().replace('T', ' ').substring(0, 19);

    // Insert sensor data
    db.prepare(
      'INSERT INTO sensors_data (timestamp, temperature, humidity, doorStatus, batteryLevel, wifiStrength) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(tsStr, temp, humidity, doorOpen, Math.round(battery * 10) / 10, wifi);

    // Update device health
    db.prepare(`
      UPDATE device_health SET lastSeen = ?, batteryLevel = ?, signalStrength = ?, status = 'online' WHERE id = 1
    `).run(tsStr, Math.round(battery * 10) / 10, wifi);

    // Log door event
    if (doorOpen) {
      db.prepare("INSERT INTO events_log (timestamp, eventType, details) VALUES (?, 'door_open', ?)")
        .run(tsStr, JSON.stringify({ duration: Math.floor(Math.random() * 60 + 5) }));
    }

    const sensorData = { id: null, timestamp: tsStr, temperature: temp, humidity, doorStatus: doorOpen, batteryLevel: Math.round(battery * 10) / 10, wifiStrength: wifi };

    // Emit via WebSocket
    if (io) {
      io.emit('sensorUpdate', sensorData);
    }

    // Evaluate alerts periodically
    if (Math.random() > 0.7) {
      const alerts = evaluateAlerts();
      if (io && alerts.length > 0) {
        io.emit('newAlerts', alerts);
      }
    }

  }, intervalMs);

  return simulatorInterval;
}

function stopSimulator() {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
  }
}

module.exports = { startSimulator, stopSimulator };
