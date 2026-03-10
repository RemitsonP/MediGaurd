import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import api from '../utils/api';

function ComplianceRing({ score, size = 120 }) {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 95 ? '#10b981' : score >= 80 ? '#f59e0b' : '#ef4444';

  return (
    <div className="compliance-ring">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 6px ${color}40)` }} />
      </svg>
      <div className="compliance-value" style={{ color, marginTop: -size / 2 - 10, position: 'relative' }}>{score}%</div>
    </div>
  );
}

export default function CompliancePage() {
  const [records, setRecords] = useState([]);
  const [weeklyAvg, setWeeklyAvg] = useState(0);
  const [latestScore, setLatestScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/compliance').then(r => {
      setRecords(r.data.records || []);
      setWeeklyAvg(r.data.weeklyAverage || 0);
      setLatestScore(r.data.latestScore || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const chartData = [...records].reverse().map(r => ({
    date: r.date,
    score: r.dailyScore,
    safeHours: r.safeHours,
    totalHours: r.totalHours,
  }));

  const statusCounts = {
    compliant: records.filter(r => r.status === 'compliant').length,
    warning: records.filter(r => r.status === 'warning').length,
    nonCompliant: records.filter(r => r.status === 'non-compliant').length,
  };

  const pieData = [
    { name: 'Compliant', value: statusCounts.compliant, color: '#10b981' },
    { name: 'Warning', value: statusCounts.warning, color: '#f59e0b' },
    { name: 'Non-Compliant', value: statusCounts.nonCompliant, color: '#ef4444' },
  ].filter(d => d.value > 0);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Compliance</h1>
        <p>Storage compliance scoring and cold chain analysis</p>
      </div>

      {/* Score Cards */}
      <div className="grid-3 mb-16">
        <div className="card text-center">
          <div className="card-title" style={{ marginBottom: 16 }}>Today's Score</div>
          <ComplianceRing score={latestScore} size={130} />
          <div className="card-sub mt-8">{latestScore >= 95 ? '✅ Compliant' : latestScore >= 80 ? '⚠️ Warning' : '❌ Non-Compliant'}</div>
        </div>

        <div className="card text-center">
          <div className="card-title" style={{ marginBottom: 16 }}>Weekly Average</div>
          <ComplianceRing score={weeklyAvg} size={130} />
          <div className="card-sub mt-8">Last 7 days average</div>
        </div>

        <div className="card text-center">
          <div className="card-title" style={{ marginBottom: 16 }}>Status Distribution</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex gap-12 justify-between" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0 20px' }}>
            {pieData.map(d => <span key={d.name} style={{ color: d.color }}>{d.name}: {d.value}</span>)}
          </div>
        </div>
      </div>

      {/* Daily Score Chart */}
      <div className="card mb-16">
        <div className="card-header">
          <span className="card-title">Daily Compliance Scores</span>
        </div>
        <div className="chart-container-lg">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} name="Compliance %">
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.score >= 95 ? '#10b981' : entry.score >= 80 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Records Table */}
      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Daily Score</th>
              <th>Safe Hours</th>
              <th>Total Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{r.date}</td>
                <td><span style={{ fontWeight: 700, color: r.dailyScore >= 95 ? 'var(--success)' : r.dailyScore >= 80 ? 'var(--warning)' : 'var(--danger)' }}>{r.dailyScore}%</span></td>
                <td>{r.safeHours?.toFixed(1)}h</td>
                <td>{r.totalHours?.toFixed(1)}h</td>
                <td><span className={`badge ${r.status === 'compliant' ? 'badge-success' : r.status === 'warning' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
