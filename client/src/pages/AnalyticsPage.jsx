import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ScatterChart, Scatter, ReferenceLine } from 'recharts';
import api from '../utils/api';

export default function AnalyticsPage() {
  const [range, setRange] = useState('24h');
  const [history, setHistory] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/sensor/history?range=${range}&limit=1000`),
      api.get('/prediction/history?limit=48'),
      api.get('/medicines/list'),
    ]).then(([h, p, m]) => {
      const data = h.data.data.map(d => {
        const dt = new Date(d.timestamp.replace(' ', 'T'));
        return {
          ...d,
          time: range === '24h'
            ? dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          temp: d.temperature,
          hum: d.humidity,
        };
      });
      setHistory(data);
      setPredictions(p.data.predictions.reverse().map(pred => ({
        ...pred,
        time: new Date(pred.timestamp.replace(' ', 'T')).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      })));
      setMedicines(m.data.medicines || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [range]);

  // Calculate anomaly data using Z-scores
  const anomalyData = (() => {
    if (history.length < 10) return [];
    const temps = history.map(d => d.temp);
    const mean = temps.reduce((a, b) => a + b, 0) / temps.length;
    const stdDev = Math.sqrt(temps.reduce((s, t) => s + Math.pow(t - mean, 2), 0) / temps.length);
    return history.map(d => ({
      ...d,
      upperBand: Math.round((mean + 2 * stdDev) * 100) / 100,
      lowerBand: Math.round((mean - 2 * stdDev) * 100) / 100,
      isAnomaly: Math.abs(d.temp - mean) > 2 * stdDev ? 1 : 0,
    }));
  })();

  // Medicine risk map
  const currentTemp = history.length > 0 ? history[history.length - 1].temp : 5;
  const medicineRiskData = medicines.map(m => {
    let risk = 0;
    if (currentTemp > m.maxTemp) risk = Math.min(100, ((currentTemp - m.maxTemp) / 5) * 100);
    else if (currentTemp < m.minTemp) risk = Math.min(100, ((m.minTemp - currentTemp) / 5) * 100);
    return { ...m, currentRisk: Math.round(risk) };
  }).sort((a, b) => b.currentRisk - a.currentRisk);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Analytics</h1>
          <p>Trend analysis, anomaly detection, and risk mapping</p>
        </div>
        <div className="btn-group">
          {['24h', '7d', '30d'].map(r => (
            <button key={r} className={`btn ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>

      {/* Temperature Trends */}
      <div className="grid-2 mb-16">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Temperature Trend ({range})</span>
          </div>
          <div className="chart-container-lg">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="atGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Max', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={2} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: 'Min', fill: '#3b82f6', fontSize: 10 }} />
                <Area type="monotone" dataKey="temp" stroke="#0ea5e9" fill="url(#atGrad)" strokeWidth={1.5} dot={false} name="Temperature °C" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Humidity Trend ({range})</span>
          </div>
          <div className="chart-container-lg">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="ahGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Max', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={20} stroke="#06b6d4" strokeDasharray="5 5" label={{ value: 'Min', fill: '#06b6d4', fontSize: 10 }} />
                <Area type="monotone" dataKey="hum" stroke="#8b5cf6" fill="url(#ahGrad)" strokeWidth={1.5} dot={false} name="Humidity %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Anomaly Detection */}
      <div className="card mb-16">
        <div className="card-header">
          <span className="card-title">Anomaly Detection (Temperature Band ±2σ)</span>
        </div>
        <div className="chart-container-lg">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={anomalyData.slice(-150)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="upperBand" stroke="none" fill="rgba(239,68,68,0.08)" name="Upper Band" />
              <Area type="monotone" dataKey="lowerBand" stroke="none" fill="rgba(14,165,233,0.08)" name="Lower Band" />
              <Line type="monotone" dataKey="temp" stroke="#0ea5e9" strokeWidth={1.5} dot={false} name="Temperature" />
              <Line type="monotone" dataKey="upperBand" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Upper σ" />
              <Line type="monotone" dataKey="lowerBand" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Lower σ" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Prediction History + Medicine Risk Map */}
      <div className="grid-2 mb-16">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Predictive Spoilage Index History</span>
          </div>
          <div className="chart-container-lg">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predictions}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="riskScore" fill="#ef4444" radius={[4, 4, 0, 0]} name="Risk Score" opacity={0.7} />
                <Bar dataKey="spoilageIndex" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Spoilage Index" opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Medicine Spoilage Risk Map */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Medicine Spoilage Risk Map</span>
            <span className="text-xs text-muted">Current Temp: {currentTemp?.toFixed(1)}°C</span>
          </div>
          <div className="spoilage-map-grid">
            {medicineRiskData.map(m => (
              <div key={m.id} className="spoilage-medicine" style={{
                borderLeftColor: m.currentRisk > 60 ? 'var(--danger)' : m.currentRisk > 20 ? 'var(--warning)' : 'var(--success)',
                borderLeftWidth: 3,
                borderLeftStyle: 'solid'
              }}>
                <div className="med-name">{m.name}</div>
                <div className="med-range">{m.minTemp}°C — {m.maxTemp}°C</div>
                <div className="med-risk" style={{
                  color: m.currentRisk > 60 ? 'var(--danger)' : m.currentRisk > 20 ? 'var(--warning)' : 'var(--success)'
                }}>
                  Risk: {m.currentRisk}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
