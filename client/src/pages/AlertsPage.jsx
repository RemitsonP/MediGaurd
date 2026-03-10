import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = () => {
    setLoading(true);
    const url = filter === 'all' ? '/alerts/history?limit=200' : `/alerts/history?severity=${filter}&limit=200`;
    api.get(url).then(r => setAlerts(r.data.alerts || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, [filter]);

  const resolveAlert = (id) => {
    api.put(`/alerts/${id}/resolve`).then(() => {
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolvedStatus: 1 } : a));
    });
  };

  const generateAlerts = () => {
    api.post('/alerts/generate').then(() => fetchAlerts());
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts.replace(' ', 'T')).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const activeAlerts = alerts.filter(a => !a.resolvedStatus);
  const resolvedAlerts = alerts.filter(a => a.resolvedStatus);

  // Reusable alert card for mobile
  const AlertCard = ({ a, showResolve }) => (
    <div className="mobile-item-card">
      <div className="mobile-item-header">
        <span className="mobile-item-title">{a.alertType.replace(/_/g, ' ')}</span>
        <span className={`badge badge-${a.severity}`}>{a.severity}</span>
      </div>
      <div className="mobile-item-details">
        <div className="mobile-item-detail">
          <span className="detail-label">Time</span>
          <span className="detail-value">{formatTime(a.timestamp)}</span>
        </div>
        <div className="mobile-item-detail">
          <span className="detail-label">Status</span>
          <span className={`badge ${a.resolvedStatus ? 'badge-success' : 'badge-warning'}`}>{a.resolvedStatus ? 'Resolved' : 'Active'}</span>
        </div>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 8 }}>{a.message}</p>
      {showResolve && !a.resolvedStatus && (
        <div className="mobile-item-actions">
          <button className="btn btn-outline btn-sm" onClick={() => resolveAlert(a.id)}>✓ Resolve</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Alerts</h1>
          <p>System alerts and shelf failure log</p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-primary btn-sm" onClick={generateAlerts}>🔄 Evaluate Now</button>
        </div>
      </div>

      <div className="flex gap-8 mb-16 items-center" style={{ flexWrap: 'wrap' }}>
        <div className="btn-group">
          {['all','critical','high','medium','low'].map(f => (
            <button key={f} className={`btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <span className="text-sm text-muted">{activeAlerts.length} active, {resolvedAlerts.length} resolved</span>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <>
          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <div className="mb-16">
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12, color: 'var(--danger)' }}>⚠ Active Alerts ({activeAlerts.length})</h3>

              {/* Desktop table */}
              <div className="card table-responsive" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Message</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAlerts.map(a => (
                      <tr key={a.id}>
                        <td>{formatTime(a.timestamp)}</td>
                        <td style={{ fontWeight: 500 }}>{a.alertType.replace(/_/g, ' ')}</td>
                        <td><span className={`badge badge-${a.severity}`}>{a.severity}</span></td>
                        <td>{a.message}</td>
                        <td><button className="btn btn-outline btn-sm" onClick={() => resolveAlert(a.id)}>Resolve</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="mobile-card-list">
                {activeAlerts.map(a => <AlertCard key={a.id} a={a} showResolve={true} />)}
              </div>
            </div>
          )}

          {/* Alert History */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Alert History</h3>

            {/* Desktop table */}
            <div className="card table-responsive" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Message</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.slice(0, 50).map(a => (
                    <tr key={a.id}>
                      <td>{formatTime(a.timestamp)}</td>
                      <td style={{ fontWeight: 500 }}>{a.alertType.replace(/_/g, ' ')}</td>
                      <td><span className={`badge badge-${a.severity}`}>{a.severity}</span></td>
                      <td style={{ maxWidth: 400 }}>{a.message}</td>
                      <td><span className={`badge ${a.resolvedStatus ? 'badge-success' : 'badge-warning'}`}>{a.resolvedStatus ? 'Resolved' : 'Active'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="mobile-card-list">
              {alerts.slice(0, 50).map(a => <AlertCard key={a.id} a={a} showResolve={false} />)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
