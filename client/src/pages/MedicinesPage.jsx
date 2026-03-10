import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function MedicinesPage() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', minTemp: '', maxTemp: '', minHumidity: 20, maxHumidity: 60, spoilageRiskLevel: 'medium', quantity: 0, shelfNumber: 1, notes: '' });

  const fetchMedicines = () => {
    setLoading(true);
    api.get('/medicines/list').then(r => setMedicines(r.data.medicines || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchMedicines(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', category: '', minTemp: '', maxTemp: '', minHumidity: 20, maxHumidity: 60, spoilageRiskLevel: 'medium', quantity: 0, shelfNumber: 1, notes: '' });
    setShowModal(true);
  };

  const openEdit = (m) => {
    setEditItem(m);
    setForm({ name: m.name, category: m.category, minTemp: m.minTemp, maxTemp: m.maxTemp, minHumidity: m.minHumidity, maxHumidity: m.maxHumidity, spoilageRiskLevel: m.spoilageRiskLevel, quantity: m.quantity || 0, shelfNumber: m.shelfNumber || 1, notes: m.notes || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, minTemp: parseFloat(form.minTemp), maxTemp: parseFloat(form.maxTemp), minHumidity: parseFloat(form.minHumidity), maxHumidity: parseFloat(form.maxHumidity), quantity: parseInt(form.quantity), shelfNumber: parseInt(form.shelfNumber) };
    if (editItem) {
      await api.put(`/medicines/${editItem.id}`, payload);
    } else {
      await api.post('/medicines', payload);
    }
    setShowModal(false);
    fetchMedicines();
  };

  const updateStock = async (id, newQty) => {
    await api.patch(`/medicines/${id}/stock`, { quantity: Math.max(0, newQty) });
    fetchMedicines();
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this medicine?')) {
      await api.delete(`/medicines/${id}`);
      fetchMedicines();
    }
  };

  const isAdmin = user?.role === 'admin';
  const canEditStock = user?.role === 'admin' || user?.role === 'pharmacist';

  // Summary stats
  const totalItems = medicines.length;
  const totalStock = medicines.reduce((s, m) => s + (m.quantity || 0), 0);
  const outOfStock = medicines.filter(m => (m.quantity || 0) === 0).length;
  const lowStock = medicines.filter(m => (m.quantity || 0) > 0 && (m.quantity || 0) <= 20).length;

  const getStockInfo = (qty) => {
    if (qty === 0) return { color: 'var(--danger)', badge: 'badge-danger', label: 'Out of Stock' };
    if (qty <= 20) return { color: 'var(--warning)', badge: 'badge-warning', label: 'Low' };
    return { color: 'var(--success)', badge: 'badge-success', label: 'In Stock' };
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Medicines</h1>
          <p>Medicine inventory, storage requirements & stock levels</p>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={openAdd}>+ Add Medicine</button>}
      </div>

      {/* Inventory Summary */}
      <div className="grid-4 mb-16">
        <div className="stat-card" style={{ '--stat-color': '#0ea5e9' }}>
          <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.15)' }}>💊</div>
          <div className="stat-info">
            <div className="stat-label">Total Medicines</div>
            <div className="stat-value">{totalItems}</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>📦</div>
          <div className="stat-info">
            <div className="stat-label">Total Stock</div>
            <div className="stat-value">{totalStock}</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#ef4444' }}>
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>⛔</div>
          <div className="stat-info">
            <div className="stat-label">Out of Stock</div>
            <div className="stat-value">{outOfStock}</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}>
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>⚠️</div>
          <div className="stat-info">
            <div className="stat-label">Low Stock (≤20)</div>
            <div className="stat-value">{lowStock}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card table-responsive" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Shelf</th>
                  <th>Stock Qty</th>
                  <th>Temp Range</th>
                  <th>Risk</th>
                  {canEditStock && <th>Update Stock</th>}
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {medicines.map(m => {
                  const qty = m.quantity || 0;
                  const stock = getStockInfo(qty);
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</td>
                      <td>{m.category}</td>
                      <td><span className="badge badge-info">Shelf {m.shelfNumber || 1}</span></td>
                      <td>
                        <div className="flex items-center gap-8">
                          <span style={{ fontWeight: 700, color: stock.color, fontSize: '1rem', minWidth: 36 }}>{qty}</span>
                          <span className={`badge ${stock.badge}`}>{stock.label}</span>
                        </div>
                      </td>
                      <td className="text-sm">{m.minTemp}°C — {m.maxTemp}°C</td>
                      <td><span className={`badge badge-${m.spoilageRiskLevel}`}>{m.spoilageRiskLevel}</span></td>
                      {canEditStock && (
                        <td>
                          <div className="flex gap-8 items-center">
                            <button className="btn btn-outline btn-sm" onClick={() => updateStock(m.id, qty - 1)} disabled={qty <= 0}>−</button>
                            <button className="btn btn-outline btn-sm" onClick={() => updateStock(m.id, qty + 10)}>+10</button>
                            <button className="btn btn-outline btn-sm" onClick={() => updateStock(m.id, qty + 50)}>+50</button>
                          </div>
                        </td>
                      )}
                      {isAdmin && (
                        <td>
                          <div className="flex gap-8">
                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}>Del</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mobile-card-list">
            {medicines.map(m => {
              const qty = m.quantity || 0;
              const stock = getStockInfo(qty);
              return (
                <div key={m.id} className="mobile-item-card">
                  <div className="mobile-item-header">
                    <span className="mobile-item-title">{m.name}</span>
                    <span className={`badge badge-${m.spoilageRiskLevel}`}>{m.spoilageRiskLevel}</span>
                  </div>
                  <div className="mobile-item-details">
                    <div className="mobile-item-detail">
                      <span className="detail-label">Category</span>
                      <span className="detail-value">{m.category}</span>
                    </div>
                    <div className="mobile-item-detail">
                      <span className="detail-label">Shelf</span>
                      <span className="detail-value">Shelf {m.shelfNumber || 1}</span>
                    </div>
                    <div className="mobile-item-detail">
                      <span className="detail-label">Stock</span>
                      <span className="detail-value" style={{ color: stock.color }}>{qty} <span className={`badge ${stock.badge}`} style={{ marginLeft: 4 }}>{stock.label}</span></span>
                    </div>
                    <div className="mobile-item-detail">
                      <span className="detail-label">Temp Range</span>
                      <span className="detail-value">{m.minTemp}°C — {m.maxTemp}°C</span>
                    </div>
                  </div>
                  {canEditStock && (
                    <div className="mobile-item-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => updateStock(m.id, qty - 1)} disabled={qty <= 0}>−1</button>
                      <button className="btn btn-outline btn-sm" onClick={() => updateStock(m.id, qty + 10)}>+10</button>
                      <button className="btn btn-outline btn-sm" onClick={() => updateStock(m.id, qty + 50)}>+50</button>
                      {isAdmin && (
                        <>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}>Del</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Medicine' : 'Add Medicine'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Risk Level</label>
                  <select className="form-select" value={form.spoilageRiskLevel} onChange={e => setForm({ ...form, spoilageRiskLevel: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Min Temp (°C)</label>
                  <input className="form-input" type="number" step="0.1" value={form.minTemp} onChange={e => setForm({ ...form, minTemp: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Temp (°C)</label>
                  <input className="form-input" type="number" step="0.1" value={form.maxTemp} onChange={e => setForm({ ...form, maxTemp: e.target.value })} required />
                </div>
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" type="number" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Shelf Number</label>
                  <input className="form-input" type="number" min="1" max="10" value={form.shelfNumber} onChange={e => setForm({ ...form, shelfNumber: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>{editItem ? 'Update' : 'Add'} Medicine</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
