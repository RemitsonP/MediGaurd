require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Initialize database
const db = require('./db/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io accessible to routes
app.io = io;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve generated reports
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/sensor', require('./routes/sensorRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/prediction', require('./routes/predictionRoutes'));
app.use('/api/device', require('./routes/deviceRoutes'));
app.use('/api/medicines', require('./routes/medicineRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'MediGuard API' });
});

// Serve built frontend (production)
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// All non-API routes → serve index.html (SPA client-side routing)
app.get(/^\/(?!api).*/, (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).json({ message: 'MediGuard API is running. Frontend not built yet — run: cd ../client && npm run build && cp -r dist ../server/public' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send latest data on connect
  const latest = db.prepare('SELECT * FROM sensors_data ORDER BY id DESC LIMIT 1').get();
  if (latest) {
    socket.emit('sensorUpdate', latest);
  }

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start simulator (disable by setting DISABLE_SIMULATOR=true in .env for production with real hardware)
if (process.env.DISABLE_SIMULATOR !== 'true') {
  const { startSimulator } = require('./services/simulator');
  startSimulator(io, 30000);
  console.log('  Simulator: active (30s interval)');
} else {
  console.log('  Simulator: disabled (using real hardware data)');
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n  MediGuard API Server running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  WebSocket: enabled\n`);
});
