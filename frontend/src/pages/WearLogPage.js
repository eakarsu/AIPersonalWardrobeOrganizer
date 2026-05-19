import React, { useState, useEffect, useCallback } from 'react';
import { getWearLogs, createWearLog, deleteWearLog, getWardrobeItems, getOutfits } from '../services/api';
import Toast from '../components/Toast';

function WearLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [wardrobeItems, setWardrobeItems] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [form, setForm] = useState({
    item_id: '', outfit_id: '', worn_date: new Date().toISOString().split('T')[0],
    occasion: '', weather: '', notes: ''
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getWearLogs({ limit: 50 });
      setLogs(r.data.logs || []);
      setTotal(r.data.total || 0);
    } catch { setLogs([]); }
    setLoading(false);
  }, []);

  const loadDropdowns = useCallback(async () => {
    try {
      const [itemsRes, outfitsRes] = await Promise.all([
        getWardrobeItems({ limit: 200 }),
        getOutfits({ limit: 200 })
      ]);
      setWardrobeItems(itemsRes.data.items || []);
      setOutfits(outfitsRes.data.outfits || []);
    } catch {}
  }, []);

  useEffect(() => { loadLogs(); loadDropdowns(); }, [loadLogs, loadDropdowns]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createWearLog(form);
      setToast({ type: 'success', msg: 'Wear logged!' });
      setShowModal(false);
      setForm({ item_id: '', outfit_id: '', worn_date: new Date().toISOString().split('T')[0], occasion: '', weather: '', notes: '' });
      loadLogs();
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Error logging wear' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this wear log entry?')) return;
    try {
      await deleteWearLog(id);
      setToast({ type: 'success', msg: 'Log entry deleted' });
      loadLogs();
    } catch { setToast({ type: 'error', msg: 'Error deleting entry' }); }
  };

  const groupByDate = (logs) => {
    const groups = {};
    logs.forEach(log => {
      const date = log.worn_date || log.created_at?.split('T')[0] || 'Unknown';
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  };

  const grouped = groupByDate(logs);

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="page-header">
        <div>
          <h1>📅 Wear Log</h1>
          <p>{total} wear entries tracked</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Log Wear</button>
      </div>

      {loading ? (
        <div className="ai-loading"><div className="spinner"></div><p>Loading...</p></div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <p>No wear logs yet. Start tracking what you wear!</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Log First Wear</button>
        </div>
      ) : (
        <div>
          {grouped.map(([date, entries]) => (
            <div key={date} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #e5e7eb' }}>
                {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              {entries.map(log => (
                <div key={log.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1f2937', fontSize: 14 }}>
                      {log.item_name || log.outfit_name || 'Wear entry'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {log.occasion && <span className="tag tag-primary">{log.occasion}</span>}
                      {log.weather && <span className="tag tag-gray">{log.weather}</span>}
                      {log.notes && <span style={{ fontSize: 12, color: '#6b7280' }}>{log.notes}</span>}
                    </div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(log.id)} title="Delete">🗑️</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>📅 Log a Wear</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" value={form.worn_date} onChange={e => setForm({ ...form, worn_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Item</label>
                  <select value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value, outfit_id: '' })}>
                    <option value="">— Select Item —</option>
                    {wardrobeItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.category})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Or Outfit</label>
                  <select value={form.outfit_id} onChange={e => setForm({ ...form, outfit_id: e.target.value, item_id: '' })}>
                    <option value="">— Select Outfit —</option>
                    {outfits.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Occasion</label>
                    <select value={form.occasion} onChange={e => setForm({ ...form, occasion: e.target.value })}>
                      <option value="">Select...</option>
                      {['Work', 'Casual', 'Date Night', 'Party', 'Gym', 'Travel', 'Formal', 'Other'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Weather</label>
                    <select value={form.weather} onChange={e => setForm({ ...form, weather: e.target.value })}>
                      <option value="">Select...</option>
                      {['Hot', 'Warm', 'Mild', 'Cool', 'Cold', 'Rainy', 'Snowy'].map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="How did you feel wearing it?" />
                </div>
                <div className="modal-footer" style={{ padding: 0, borderTop: 'none', marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Log Wear</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WearLogPage;
