import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import api from '../utils/api';

export default function MonitoringPage() {
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedShelf, setExpandedShelf] = useState(null);

  const fetchShelves = () => {
    setLoading(true);
    api.get('/medicines/shelves').then(r => {
      setShelves(r.data.shelves || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchShelves(); }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchShelves, 30000);
    return () => clearInterval(interval);
  }, []);

  // Summary
  const totalMeds = shelves.reduce((s, sh) => s + sh.totalItems, 0);
  const totalQty = shelves.reduce((s, sh) => s + sh.totalQuantity, 0);
  const totalOOS = shelves.reduce((s, sh) => s + sh.outOfStock, 0);
  const totalRisk = shelves.reduce((s, sh) => s + sh.atRisk, 0);

  // Chart data per shelf
  const shelfChartData = shelves.map(sh => ({
    name: `Shelf ${sh.shelfNumber}`,
    stock: sh.totalQuantity,
    items: sh.totalItems,
    temp: sh.temperature,
  }));

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Shelf Monitoring</h1>
        <p>Real-time medicine availability, temperature & humidity per shelf</p>
      </div>

      {/* Summary */}
      <div className="grid-4 mb-16">
        <div className="stat-card" style={{ '--stat-color': '#0ea5e9' }}>
          <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.15)' }}>🗄️</div>
          <div className="stat-info">
            <div className="stat-label">Total Shelves</div>
            <div className="stat-value">{shelves.length}</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>📦</div>
          <div className="stat-info">
            <div className="stat-label">Total Stock</div>
            <div className="stat-value">{totalQty}</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#ef4444' }}>
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>⛔</div>
          <div className="stat-info">
            <div className="stat-label">Out of Stock</div>
            <div className="stat-value">{totalOOS}</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}>
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>⚠️</div>
          <div className="stat-info">
            <div className="stat-label">At Risk</div>
            <div className="stat-value">{totalRisk}</div>
          </div>
        </div>
      </div>

      {/* Shelf-by-Shelf View */}
      <div className="shelf-monitoring-grid">
        {shelves.map(shelf => {
          const isExpanded = expandedShelf === shelf.shelfNumber;
          const tempColor = shelf.temperature > 8 || shelf.temperature < 2 ? 'var(--danger)' : shelf.temperature > 7 ? 'var(--warning)' : 'var(--success)';
          const humColor = shelf.humidity > 60 || shelf.humidity < 20 ? 'var(--warning)' : 'var(--success)';

          return (
            <div key={shelf.shelfNumber} className="shelf-card" onClick={() => setExpandedShelf(isExpanded ? null : shelf.shelfNumber)}>
              {/* Shelf Header */}
              <div className="shelf-header">
                <div className="shelf-title">
                  <span className="shelf-icon">🗄️</span>
                  <span>Shelf {shelf.shelfNumber}</span>
                </div>
                <div className="shelf-env-badges">
                  <span className="env-badge" style={{ color: tempColor, borderColor: tempColor }}>
                    🌡️ {shelf.temperature}°C
                  </span>
                  <span className="env-badge" style={{ color: humColor, borderColor: humColor }}>
                    💧 {shelf.humidity}%
                  </span>
                </div>
              </div>

              {/* Shelf Stats */}
              <div className="shelf-stats">
                <div className="shelf-stat">
                  <span className="shelf-stat-value">{shelf.totalItems}</span>
                  <span className="shelf-stat-label">Items</span>
                </div>
                <div className="shelf-stat">
                  <span className="shelf-stat-value" style={{ color: 'var(--success)' }}>{shelf.totalQuantity}</span>
                  <span className="shelf-stat-label">Total Qty</span>
                </div>
                <div className="shelf-stat">
                  <span className="shelf-stat-value" style={{ color: shelf.outOfStock > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{shelf.outOfStock}</span>
                  <span className="shelf-stat-label">Out of Stock</span>
                </div>
                <div className="shelf-stat">
                  <span className="shelf-stat-value" style={{ color: shelf.atRisk > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{shelf.atRisk}</span>
                  <span className="shelf-stat-label">At Risk</span>
                </div>
              </div>

              {/* Expanded Medicine List */}
              {isExpanded && (
                <div className="shelf-medicines-list" onClick={e => e.stopPropagation()}>
                  <div className="shelf-medicines-header">
                    <span>Medicine</span>
                    <span>Qty</span>
                    <span>Status</span>
                    <span>Temp Safe</span>
                  </div>
                  {shelf.medicines.map(m => (
                    <div key={m.id} className={`shelf-medicine-row ${m.status}`}>
                      <div className="shelf-med-name">
                        <span className="med-main-name">{m.name}</span>
                        <span className="med-category">{m.category}</span>
                      </div>
                      <div className="shelf-med-qty">
                        <span style={{ fontWeight: 700, color: m.inStock ? 'var(--text-primary)' : 'var(--danger)', fontSize: '1rem' }}>{m.quantity || 0}</span>
                      </div>
                      <div>
                        <span className={`badge ${m.status === 'safe' ? 'badge-success' : m.status === 'out-of-stock' ? 'badge-danger' : 'badge-warning'}`}>
                          {m.status === 'out-of-stock' ? 'No Stock' : m.status === 'at-risk' ? 'At Risk' : 'Safe'}
                        </span>
                      </div>
                      <div className="shelf-med-temp-check">
                        <span style={{ color: m.tempSafe ? 'var(--success)' : 'var(--danger)' }}>
                          {m.tempSafe ? '✓' : '✗'} {m.minTemp}–{m.maxTemp}°C
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="shelf-expand-hint">
                {isExpanded ? '▲ Collapse' : '▼ Tap to view medicines'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stock Distribution Chart */}
      <div className="card mt-20">
        <div className="card-header">
          <span className="card-title">Stock Distribution by Shelf</span>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shelfChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="stock" radius={[6, 6, 0, 0]} name="Stock Quantity">
                {shelfChartData.map((entry, i) => (
                  <Cell key={i} fill={['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'][i % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
