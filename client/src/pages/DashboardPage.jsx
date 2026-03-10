import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useSocket } from '../hooks/useSocket';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';

function GaugeChart({ value, max = 100, label, color = '#0ea5e9' }) {
  const pct = Math.min(value / max, 1);
  const angle = pct * 180;
  const r = 70;
  const cx = 90, cy = 85;
  const endX = cx + r * Math.cos(Math.PI - (angle * Math.PI / 180));
  const endY = cy - r * Math.sin(angle * Math.PI / 180);
  const largeArc = angle > 180 ? 1 : 0;
  const gaugeColor = value < 30 ? '#10b981' : value < 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="gauge-container">
      <svg className="gauge-svg" viewBox="0 0 180 110">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="12" strokeLinecap="round" />
        {value > 0 && (
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`} fill="none" stroke={gaugeColor} strokeWidth="12" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${gaugeColor}40)` }} />
        )}
      </svg>
      <div className="gauge-value-text" style={{ color: gaugeColor }}>{value}</div>
      <div className="gauge-label">{label}</div>
    </div>
  );
}

function StatCard({ icon, label, value, unit, change, color, trend }) {
  return (
    <div className="stat-card" style={{ '--stat-color': color }}>
      <div className="stat-icon" style={{ background: `${color}20`, color }}>{icon}</div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}<span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>{unit}</span></div>
        {change !== undefined && (
          <div className={`stat-change ${trend || 'stable'}`}>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {change}</div>
        )}
      </div>
    </div>
  );
}

function CabinetViz({ temperature, humidity, doorOpen }) {
  const status = doorOpen ? 'open' : 'closed';
  const shelves = [
    { label: 'Vaccines', temp: temperature, status: temperature > 8 || temperature < 2 ? 'danger' : temperature > 7 ? 'warning' : 'safe' },
    { label: 'Insulin', temp: (temperature + 0.3).toFixed(1), status: temperature > 7.5 ? 'danger' : 'safe' },
    { label: 'Antibiotics', temp: (temperature - 0.2).toFixed(1), status: temperature > 8.5 || temperature < 1.5 ? 'danger' : 'safe' },
    { label: 'Eye Drops', temp: (temperature + 0.5).toFixed(1), status: 'safe' },
  ];

  return (
    <div className="cabinet-viz">
      <div className="cabinet-outer">
        {shelves.map((s, i) => (
          <div key={i} className={`cabinet-shelf ${s.status}`}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</span>
            <span style={{ fontWeight: 700, color: s.status === 'danger' ? 'var(--danger)' : s.status === 'warning' ? 'var(--warning)' : 'var(--success)' }}>
              {s.temp}°C
            </span>
          </div>
        ))}
        <div className={`cabinet-door-status ${status}`}>
          {doorOpen ? '⚠️ DOOR OPEN' : '🔒 Door Closed'}
        </div>
      </div>
    </div>
  );
}

function EventFeed({ events }) {
  const typeMap = { door_open: 'door', temp_excursion: 'temp', alert: 'alert' };
  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts.replace(' ', 'T'));
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };
  const labelMap = {
    door_open: 'Door opened',
    temp_excursion: 'Temperature excursion',
    alert: 'Alert triggered',
  };

  return (
    <div className="event-feed">
      {events.slice(0, 20).map((ev, i) => (
        <div key={i} className="event-item">
          <div className={`event-dot ${typeMap[ev.eventType] || 'system'}`} />
          <div className="event-text">{labelMap[ev.eventType] || ev.eventType}</div>
          <div className="event-time">{formatTime(ev.timestamp)}</div>
        </div>
      ))}
      {events.length === 0 && <div className="text-muted text-sm" style={{ padding: 16 }}>No recent events</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { latestData, connected } = useSocket();
  const { setEmergency } = useTheme();
  const [history, setHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const [prediction, setPrediction] = useState({ spoilageIndex: 0, riskScore: 0, forecast: [] });
  const [coldChainData, setColdChainData] = useState([]);

  useEffect(() => {
    api.get('/sensor/history?range=24h&limit=288').then(r => {
      const data = r.data.data.map(d => ({
        ...d,
        time: new Date(d.timestamp.replace(' ', 'T')).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        temp: d.temperature,
        hum: d.humidity,
      }));
      setHistory(data);
      setColdChainData(data.slice(-48));
    }).catch(() => {});

    api.get('/reports/events?limit=30').then(r => setEvents(r.data.events || [])).catch(() => {});
    api.get('/prediction/spoilage').then(r => setPrediction(r.data)).catch(() => {});
  }, []);

  // Add live data to history
  useEffect(() => {
    if (latestData) {
      setHistory(prev => {
        const next = [...prev, {
          ...latestData,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          temp: latestData.temperature,
          hum: latestData.humidity,
        }];
        return next.slice(-300);
      });
    }
  }, [latestData]);

  const current = latestData || history[history.length - 1] || {};
  const temp = current.temperature ?? current.temp ?? 0;
  const hum = current.humidity ?? current.hum ?? 0;

  // Emergency mode trigger
  useEffect(() => {
    const isEmergency = temp > 12 || temp < 0 || hum > 80 || hum < 10;
    setEmergency(isEmergency);
  }, [temp, hum, setEmergency]);

  const isEmergency = temp > 12 || temp < 0;

  return (
    <div className="fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Dashboard</h1>
          <p>Real-time storage environment monitoring</p>
        </div>
        <div className="flex items-center gap-8">
          <span className={`badge ${connected ? 'badge-success' : 'badge-danger'}`}>
            {connected ? '● Live' : '○ Offline'}
          </span>
        </div>
      </div>

      {isEmergency && (
        <div className="emergency-banner">
          <span className="icon">🚨</span>
          <span className="text">EMERGENCY: Storage conditions are outside safe range! Temperature: {temp}°C</span>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid-4 mb-16">
        <StatCard icon="🌡️" label="Temperature" value={temp?.toFixed(1)} unit="°C" color={temp > 8 || temp < 2 ? '#ef4444' : '#10b981'} change={temp > 8 ? 'Above range' : temp < 2 ? 'Below range' : 'Normal'} trend={temp > 8 ? 'up' : temp < 2 ? 'down' : 'stable'} />
        <StatCard icon="💧" label="Humidity" value={hum?.toFixed(1)} unit="%" color={hum > 60 ? '#f59e0b' : '#06b6d4'} change={hum > 60 ? 'High' : 'Optimal'} trend={hum > 60 ? 'up' : 'stable'} />
        <StatCard icon="🔋" label="Battery" value={current.batteryLevel?.toFixed(0) || '—'} unit="%" color={current.batteryLevel < 30 ? '#ef4444' : '#10b981'} />
        <StatCard icon="📶" label="WiFi Signal" value={current.wifiStrength?.toFixed(0) || '—'} unit="dBm" color="#8b5cf6" />
      </div>

      {/* Main charts + gauges row */}
      <div className="grid-2 mb-16">
        {/* Temperature & Humidity Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Temperature & Humidity (24h)</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history.slice(-100)}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="temp" stroke="#0ea5e9" fill="url(#tempGrad)" strokeWidth={2} name="Temp °C" dot={false} />
                <Area type="monotone" dataKey="hum" stroke="#8b5cf6" fill="url(#humGrad)" strokeWidth={1.5} name="Humidity %" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Score & Spoilage Index */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Risk Assessment</span>
          </div>
          <div className="grid-2" style={{ gap: 8 }}>
            <GaugeChart value={Math.round(prediction.riskScore)} label="Risk Score" color="#ef4444" />
            <GaugeChart value={Math.round(prediction.spoilageIndex)} label="Spoilage Index" color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* Forecast + Cabinet + Events Row */}
      <div className="grid-3 mb-16">
        {/* 12h Forecast */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">12-Hour Forecast</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={prediction.forecast || []}>
                <defs>
                  <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'Hours', position: 'insideBottom', fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="upperBound" stroke="none" fill="rgba(239,68,68,0.1)" name="Upper Band" />
                <Area type="monotone" dataKey="lowerBound" stroke="none" fill="rgba(14,165,233,0.1)" name="Lower Band" />
                <Line type="monotone" dataKey="temperature" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3, fill: '#06b6d4' }} name="Predicted °C" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Digital Twin */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Cabinet Digital Twin</span>
          </div>
          <CabinetViz temperature={temp} humidity={hum} doorOpen={current.doorStatus === 1} />
        </div>

        {/* Event Feed */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Event Feed</span>
          </div>
          <EventFeed events={events} />
        </div>
      </div>

      {/* Cold Chain Timeline */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Cold Chain Stability Timeline</span>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={coldChainData}>
              <defs>
                <linearGradient id="ccGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }} />
              {/* Safe range band */}
              <Area type="monotone" dataKey="temp" stroke="#10b981" fill="url(#ccGrad)" strokeWidth={2} dot={false} name="Temperature °C" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
