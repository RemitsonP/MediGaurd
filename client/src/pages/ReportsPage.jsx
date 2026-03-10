import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchReports = () => {
    setLoading(true);
    api.get('/reports/list').then(r => setReports(r.data.reports || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, []);

  const generateReport = async (type) => {
    setGenerating(true);
    try {
      await api.post('/reports/generate', { type });
      fetchReports();
    } catch (err) {
      alert('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = (id) => {
    window.open(`/api/reports/download/${id}`, '_blank');
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    return new Date(ts.replace(' ', 'T')).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Reports</h1>
        <p>Generate and download compliance and analytics reports</p>
      </div>

      {/* Generate Section */}
      <div className="grid-3 mb-16">
        <div className="card text-center">
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>Weekly Report</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>Summary of the last 7 days including compliance, alerts, and temperature data</p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => generateReport('weekly')} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Weekly'}
          </button>
        </div>

        <div className="card text-center">
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📊</div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>Monthly Report</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>Comprehensive monthly analysis with trends, compliance history, and predictions</p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => generateReport('monthly')} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Monthly'}
          </button>
        </div>

        <div className="card text-center">
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚙️</div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>Auto-Schedule</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>Reports auto-generate weekly on Sundays and monthly on the 1st</p>
          <div className="badge badge-success" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>Active</div>
        </div>
      </div>

      {/* Reports History */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <span className="card-title">Generated Reports</span>
        </div>
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : reports.length === 0 ? (
          <div className="text-center text-muted" style={{ padding: 40 }}>No reports generated yet. Click generate above to create your first report.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Generated</th>
                <th>File</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td><span className={`badge ${r.type === 'weekly' ? 'badge-info' : 'badge-success'}`}>{r.type}</span></td>
                  <td>{formatDate(r.generatedAt)}</td>
                  <td className="text-xs text-muted">{r.filePath}</td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => downloadReport(r.id)}>📥 Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
