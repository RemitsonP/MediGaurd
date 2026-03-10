const express = require('express');
const db = require('../db/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// GET /api/medicines/list
router.get('/list', authenticateToken, (req, res) => {
  try {
    const medicines = db.prepare('SELECT * FROM medicines ORDER BY shelfNumber ASC, name ASC').all();
    res.json({ medicines });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
});

// GET /api/medicines/shelves — shelf-by-shelf monitoring
router.get('/shelves', authenticateToken, (req, res) => {
  try {
    // Get medicines grouped by shelf
    const medicines = db.prepare('SELECT * FROM medicines ORDER BY shelfNumber ASC, name ASC').all();
    
    // Group by shelf
    const shelvesMap = {};
    medicines.forEach(m => {
      const shelf = m.shelfNumber || 1;
      if (!shelvesMap[shelf]) {
        shelvesMap[shelf] = { shelfNumber: shelf, medicines: [], totalQuantity: 0, totalItems: 0 };
      }
      shelvesMap[shelf].medicines.push(m);
      shelvesMap[shelf].totalQuantity += (m.quantity || 0);
      shelvesMap[shelf].totalItems++;
    });

    // Get latest sensor data for environmental context
    const latestSensor = db.prepare('SELECT * FROM sensors_data ORDER BY id DESC LIMIT 1').get();
    
    // Build shelf data with per-shelf simulated temp/humidity (slight variations per shelf position)
    const shelves = Object.values(shelvesMap).map((shelf, idx) => {
      const baseTemp = latestSensor ? latestSensor.temperature : 5;
      const baseHum = latestSensor ? latestSensor.humidity : 45;
      // Top shelves slightly warmer, bottom slightly cooler
      const tempOffset = (idx - Math.floor(Object.keys(shelvesMap).length / 2)) * 0.3;
      const humOffset = (idx - Math.floor(Object.keys(shelvesMap).length / 2)) * 1.2;

      const shelfTemp = Math.round((baseTemp + tempOffset) * 100) / 100;
      const shelfHum = Math.round((baseHum + humOffset) * 100) / 100;

      // Check medicine safety on this shelf
      const medicinesStatus = shelf.medicines.map(m => {
        const tempSafe = shelfTemp >= m.minTemp && shelfTemp <= m.maxTemp;
        const humSafe = shelfHum >= m.minHumidity && shelfHum <= m.maxHumidity;
        const inStock = (m.quantity || 0) > 0;
        return {
          ...m,
          currentTemp: shelfTemp,
          currentHumidity: shelfHum,
          tempSafe,
          humSafe,
          inStock,
          status: !inStock ? 'out-of-stock' : (!tempSafe || !humSafe) ? 'at-risk' : 'safe'
        };
      });

      return {
        shelfNumber: shelf.shelfNumber,
        temperature: shelfTemp,
        humidity: shelfHum,
        totalQuantity: shelf.totalQuantity,
        totalItems: shelf.totalItems,
        outOfStock: medicinesStatus.filter(m => !m.inStock).length,
        atRisk: medicinesStatus.filter(m => m.status === 'at-risk').length,
        medicines: medicinesStatus
      };
    });

    res.json({ shelves });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shelf data', details: err.message });
  }
});

// POST /api/medicines
router.post('/', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { name, category, minTemp, maxTemp, minHumidity, maxHumidity, spoilageRiskLevel, quantity, shelfNumber, notes } = req.body;
    if (!name || !category || minTemp === undefined || maxTemp === undefined) {
      return res.status(400).json({ error: 'Name, category, minTemp, maxTemp are required' });
    }
    const result = db.prepare(
      'INSERT INTO medicines (name, category, minTemp, maxTemp, minHumidity, maxHumidity, spoilageRiskLevel, quantity, shelfNumber, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(name, category, minTemp, maxTemp, minHumidity || 20, maxHumidity || 60, spoilageRiskLevel || 'medium', quantity || 0, shelfNumber || 1, notes || '');
    res.status(201).json({ message: 'Medicine added', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add medicine' });
  }
});

// PUT /api/medicines/:id
router.put('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { name, category, minTemp, maxTemp, minHumidity, maxHumidity, spoilageRiskLevel, quantity, shelfNumber, notes } = req.body;
    db.prepare(
      'UPDATE medicines SET name=?, category=?, minTemp=?, maxTemp=?, minHumidity=?, maxHumidity=?, spoilageRiskLevel=?, quantity=?, shelfNumber=?, notes=? WHERE id=?'
    ).run(name, category, minTemp, maxTemp, minHumidity, maxHumidity, spoilageRiskLevel, quantity || 0, shelfNumber || 1, notes, req.params.id);
    res.json({ message: 'Medicine updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update medicine' });
  }
});

// PATCH /api/medicines/:id/stock — quick stock update
router.patch('/:id/stock', authenticateToken, authorizeRoles('admin', 'pharmacist'), (req, res) => {
  try {
    const { quantity } = req.body;
    if (quantity === undefined) return res.status(400).json({ error: 'Quantity is required' });
    db.prepare('UPDATE medicines SET quantity = ? WHERE id = ?').run(parseInt(quantity), req.params.id);
    res.json({ message: 'Stock updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// DELETE /api/medicines/:id
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    db.prepare('DELETE FROM medicines WHERE id = ?').run(req.params.id);
    res.json({ message: 'Medicine deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete medicine' });
  }
});

module.exports = router;
