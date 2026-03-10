import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../utils/api';

export default function DeviceHealthPage() {
  const [device, setDevice] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/device/health'),
      api.get('/sensor/history?range=24h&limit=288'),
    ]).then(([d, h]) => {
      setDevice(d.data.device);
      setHistory(h.data.data.map(s => ({
        time: new Date(s.timestamp.replace(' ', 'T')).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        battery: s.batteryLevel,
        wifi: s.wifiStrength,
      })));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!device) return <div className="text-muted text-center" style={{ padding: 40 }}>No device data available</div>;

  const uptimeHours = Math.round((device.uptime || 0) / 3600);
  const uptimeDays = Math.floor(uptimeHours / 24);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Device Health</h1>
        <p>Monitor ESP8266 device status, connectivity, and power</p>
      </div>

      <div className="grid-4 mb-16">
        <div className="stat-card" style={{ '--stat-color': device.status === 'online' ? 'var(--success)' : 'var(--danger)' }}>
          <div className="stat-icon" style={{ background: device.status === 'online' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
            {device.status === 'online' ? '🟢' : '🔴'}
          </div>
          <div className="stat-info">
            <div className="stat-label">Status</div>
            <div className="stat-value" style={{ fontSize: '1.2rem', color: device.status === 'online' ? 'var(--success)' : 'var(--danger)' }}>{device.status?.toUpperCase()}</div>
          </div>
        </div>

        <div className="stat-card" style={{ '--stat-color': 'var(--info)' }}>
          <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>⏱️</div>
          <div className="stat-info">
            <div className="stat-label">Uptime</div>
            <div className="stat-value" style={{ fontSize: '1.2rem' }}>{uptimeDays}d {uptimeHours % 24}h</div>
          </div>
        </div>

        <div className="stat-card" style={{ '--stat-color': device.batteryLevel < 30 ? 'var(--danger)' : 'var(--success)' }}>
          <div className="stat-icon" style={{ background: device.batteryLevel < 30 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)' }}>🔋</div>
          <div className="stat-info">
            <div className="stat-label">Battery</div>
            <div className="stat-value" style={{ fontSize: '1.2rem' }}>{device.batteryLevel?.toFixed(1)}%</div>
          </div>
        </div>

        <div className="stat-card" style={{ '--stat-color': 'var(--accent)' }}>
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>📶</div>
          <div className="stat-info">
            <div className="stat-label">WiFi Signal</div>
            <div className="stat-value" style={{ fontSize: '1.2rem' }}>{device.signalStrength?.toFixed(0)} dBm</div>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-16">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Battery Level (24h)</span>
          </div>
          <div className="chart-container-lg">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="battery" stroke="#10b981" strokeWidth={2} dot={false} name="Battery %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">WiFi Signal Strength (24h)</span>
          </div>
          <div className="chart-container-lg">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[-80, -20]} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="wifi" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Signal dBm" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Device Info Card */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Device Information</span>
        </div>
        <div className="grid-2" style={{ gap: 16 }}>
          <div>
            <div className="text-xs text-muted">Firmware Version</div>
            <div style={{ fontWeight: 600, marginTop: 2 }}>{device.firmwareVersion || 'Unknown'}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Last Seen</div>
            <div style={{ fontWeight: 600, marginTop: 2 }}>{device.lastSeen ? new Date(device.lastSeen.replace(' ', 'T')).toLocaleString() : 'Unknown'}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Device Type</div>
            <div style={{ fontWeight: 600, marginTop: 2 }}>ESP8266 NodeMCU</div>
          </div>
          <div>
            <div className="text-xs text-muted">Data Interval</div>
            <div style={{ fontWeight: 600, marginTop: 2 }}>Every 30 seconds</div>
          </div>
        </div>
      </div>
    </div>
  );
}
