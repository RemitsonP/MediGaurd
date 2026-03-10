const db = require('./database');
const bcrypt = require('bcryptjs');

function seed() {
  console.log('Seeding database...');

  // Clear existing data
  db.exec(`
    DELETE FROM sensors_data;
    DELETE FROM alerts;
    DELETE FROM predictions;
    DELETE FROM events_log;
    DELETE FROM device_health;
    DELETE FROM medicines;
    DELETE FROM compliance_records;
    DELETE FROM reports;
    DELETE FROM users;
  `);

  // Seed users
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  const insertUser = db.prepare('INSERT INTO users (username, email, passwordHash, role) VALUES (?, ?, ?, ?)');
  insertUser.run('admin', 'admin@medigaurd.com', hashedPassword, 'admin');
  insertUser.run('pharmacist', 'pharma@medigaurd.com', bcrypt.hashSync('pharma123', 10), 'pharmacist');
  insertUser.run('auditor', 'auditor@medigaurd.com', bcrypt.hashSync('audit123', 10), 'auditor');
  console.log('  Users seeded');

  // Seed medicines — [name, category, minTemp, maxTemp, minHumidity, maxHumidity, spoilageRiskLevel, quantity, shelfNumber, notes]
  const insertMed = db.prepare('INSERT INTO medicines (name, category, minTemp, maxTemp, minHumidity, maxHumidity, spoilageRiskLevel, quantity, shelfNumber, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const medicines = [
    ['Insulin Glargine', 'Hormone', 2, 8, 20, 60, 'critical', 45, 1, 'Must maintain cold chain. Discard if frozen or above 8°C for >30min.'],
    ['MMR Vaccine', 'Vaccine', 2, 8, 20, 50, 'critical', 120, 1, 'Light sensitive. Maintain strict cold chain at all times.'],
    ['Hepatitis B Vaccine', 'Vaccine', 2, 8, 20, 50, 'critical', 80, 1, 'Do not freeze. Discard if frozen.'],
    ['Amoxicillin Suspension', 'Antibiotic', 2, 8, 30, 60, 'high', 200, 2, 'Reconstituted form must be refrigerated.'],
    ['Oxytocin Injection', 'Hormone', 2, 8, 20, 60, 'high', 35, 2, 'Heat sensitive. Protect from light.'],
    ['Tetanus Toxoid', 'Vaccine', 2, 8, 20, 50, 'critical', 0, 2, 'Freeze sensitive. Monitor closely. OUT OF STOCK — reorder pending.'],
    ['Oral Polio Vaccine', 'Vaccine', -20, -15, 10, 40, 'critical', 60, 1, 'Must be stored frozen. Extremely temperature sensitive.'],
    ['Adrenaline Injection', 'Emergency Drug', 15, 25, 30, 60, 'medium', 25, 3, 'Room temperature storage. Protect from light.'],
    ['Paracetamol Tablets', 'Analgesic', 15, 30, 20, 60, 'low', 500, 3, 'Store in dry place below 30°C.'],
    ['Metformin Tablets', 'Antidiabetic', 15, 30, 20, 60, 'low', 300, 3, 'Room temperature. Protect from moisture.'],
    ['Diazepam Injection', 'Sedative', 15, 25, 20, 50, 'medium', 15, 4, 'Protect from light. Do not freeze.'],
    ['BCG Vaccine', 'Vaccine', 2, 8, 20, 50, 'critical', 90, 1, 'Light sensitive. Use within 6 hours of reconstitution.'],
    ['Ergometrine Injection', 'Uterotonic', 2, 8, 20, 60, 'high', 0, 2, 'Extremely heat sensitive. OUT OF STOCK.'],
    ['Gentamicin Eye Drops', 'Antibiotic', 2, 25, 20, 60, 'medium', 40, 4, 'Discard 28 days after opening.'],
    ['DPT Vaccine', 'Vaccine', 2, 8, 20, 50, 'critical', 110, 4, 'Do not freeze. Shake well before use.']
  ];
  medicines.forEach(m => insertMed.run(...m));
  console.log('  Medicines seeded');

  // Seed 48 hours of sensor data
  const insertSensor = db.prepare('INSERT INTO sensors_data (timestamp, temperature, humidity, doorStatus, batteryLevel, wifiStrength) VALUES (?, ?, ?, ?, ?, ?)');
  const insertEvent = db.prepare('INSERT INTO events_log (timestamp, eventType, details) VALUES (?, ?, ?)');
  const insertAlert = db.prepare('INSERT INTO alerts (timestamp, alertType, severity, message, resolvedStatus) VALUES (?, ?, ?, ?, ?)');
  const insertPrediction = db.prepare('INSERT INTO predictions (timestamp, spoilageIndex, riskScore, forecastValues) VALUES (?, ?, ?, ?)');
  const insertCompliance = db.prepare('INSERT INTO compliance_records (date, dailyScore, weeklyScore, safeHours, totalHours, status) VALUES (?, ?, ?, ?, ?, ?)');

  const now = new Date();
  const dataPoints = 48 * 12; // 5-minute intervals for 48 hours
  let batteryLevel = 98;
  let safeHoursToday = 0;
  let totalHoursToday = 0;
  let currentDay = null;

  const sensorInsertMany = db.transaction(() => {
    for (let i = dataPoints; i >= 0; i--) {
      const ts = new Date(now.getTime() - i * 5 * 60 * 1000);
      const tsStr = ts.toISOString().replace('T', ' ').substring(0, 19);
      const hour = ts.getHours();
      const day = ts.toISOString().substring(0, 10);

      // Realistic temperature: base 4°C with daily cycle and random noise
      const dailyCycle = Math.sin((hour - 6) * Math.PI / 12) * 1.5;
      const noise = (Math.random() - 0.5) * 0.8;
      let temp = 4 + dailyCycle + noise;

      // Inject occasional spikes
      const spikeChance = Math.random();
      if (spikeChance > 0.995) {
        temp += (Math.random() * 6 + 3); // High spike
      } else if (spikeChance > 0.990) {
        temp -= (Math.random() * 3 + 2); // Low spike (near freezing)
      }
      temp = Math.round(temp * 100) / 100;

      // Humidity: base 45% with noise
      const humidity = Math.round((45 + (Math.random() - 0.5) * 15 + dailyCycle * 2) * 100) / 100;

      // Door events
      const doorOpen = (hour >= 8 && hour <= 18 && Math.random() > 0.92) ? 1 : 0;

      // Battery drain
      batteryLevel = Math.max(20, batteryLevel - Math.random() * 0.02);

      // WiFi fluctuation
      const wifiStrength = -35 - Math.random() * 25;

      insertSensor.run(tsStr, temp, humidity, doorOpen, Math.round(batteryLevel * 10) / 10, Math.round(wifiStrength));

      // Log door events
      if (doorOpen) {
        insertEvent.run(tsStr, 'door_open', JSON.stringify({ duration: Math.floor(Math.random() * 120 + 10) }));
      }

      // Generate alerts for out-of-range values
      if (temp > 8) {
        insertAlert.run(tsStr, 'temperature_high', temp > 12 ? 'critical' : 'high', 
          `Temperature exceeded safe range: ${temp}°C`, temp <= 10 ? 1 : 0);
        insertEvent.run(tsStr, 'temp_excursion', JSON.stringify({ temperature: temp, threshold: 8 }));
      } else if (temp < 2) {
        insertAlert.run(tsStr, 'temperature_low', temp < 0 ? 'critical' : 'medium', 
          `Temperature below safe range: ${temp}°C`, 1);
        insertEvent.run(tsStr, 'temp_excursion', JSON.stringify({ temperature: temp, threshold: 2 }));
      }

      // Track compliance
      if (day !== currentDay) {
        if (currentDay && totalHoursToday > 0) {
          const score = Math.round((safeHoursToday / totalHoursToday) * 100 * 10) / 10;
          const status = score >= 95 ? 'compliant' : score >= 80 ? 'warning' : 'non-compliant';
          insertCompliance.run(currentDay, score, null, safeHoursToday, totalHoursToday, status);
        }
        currentDay = day;
        safeHoursToday = 0;
        totalHoursToday = 0;
      }
      totalHoursToday += 5 / 60;
      if (temp >= 2 && temp <= 8 && humidity >= 20 && humidity <= 60) {
        safeHoursToday += 5 / 60;
      }

      // Predictions every hour
      if (i % 12 === 0) {
        const riskScore = Math.min(100, Math.max(0, ((temp - 5) / 5) * 50 + (humidity > 60 ? 20 : 0) + (doorOpen ? 10 : 0) + Math.random() * 10));
        const spoilageIndex = Math.min(100, Math.max(0, riskScore * 0.7 + Math.random() * 10));
        const forecast = [];
        for (let f = 1; f <= 12; f++) {
          forecast.push(Math.round((temp + (Math.random() - 0.5) * 2 + f * 0.1) * 100) / 100);
        }
        insertPrediction.run(tsStr, Math.round(spoilageIndex * 10) / 10, Math.round(riskScore * 10) / 10, JSON.stringify(forecast));
      }
    }

    // Final day compliance
    if (currentDay && totalHoursToday > 0) {
      const score = Math.round((safeHoursToday / totalHoursToday) * 100 * 10) / 10;
      const status = score >= 95 ? 'compliant' : score >= 80 ? 'warning' : 'non-compliant';
      insertCompliance.run(currentDay, score, null, safeHoursToday, totalHoursToday, status);
    }
  });

  sensorInsertMany();
  console.log('  Sensor data seeded (48h of 5-min intervals)');

  // Seed device health
  db.prepare('INSERT INTO device_health (lastSeen, uptime, signalStrength, batteryLevel, firmwareVersion, status) VALUES (?, ?, ?, ?, ?, ?)').run(
    now.toISOString().replace('T', ' ').substring(0, 19), 172800, -42, batteryLevel, '2.1.3', 'online'
  );
  console.log('  Device health seeded');

  console.log('Database seeding complete!');
}

seed();
