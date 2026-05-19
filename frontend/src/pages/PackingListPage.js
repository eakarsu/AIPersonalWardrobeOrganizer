import React, { useState, useEffect, useCallback } from 'react';
import { getPackingLists, deletePackingList, aiPackingList } from '../services/api';
import Toast from '../components/Toast';

function PackingListPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [form, setForm] = useState({
    destination: '', dates: '', occasions: [], weather_forecast: ''
  });

  const OCCASIONS = ['Business', 'Casual', 'Beach', 'Formal', 'Adventure', 'City', 'Party'];

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getPackingLists();
      const data = r.data;
      setLists(Array.isArray(data) ? data : (data.packingLists || []));
    } catch { setLists([]); }
    setLoading(false);
  }, []);

  useEffect(() => { loadLists(); }, [loadLists]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const r = await aiPackingList({
        destination: form.destination,
        dates: form.dates,
        occasions: form.occasions,
        weather_forecast: form.weather_forecast
      });
      setToast({ type: 'success', msg: 'Packing list generated!' });
      setShowModal(false);
      setForm({ destination: '', dates: '', occasions: [], weather_forecast: '' });
      loadLists();
      if (r.data.parsed) setSelectedList({ ...r.data, ai_suggestions: r.data.parsed, destination: form.destination });
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Error generating packing list' });
    }
    setGenerating(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this packing list?')) return;
    try {
      await deletePackingList(id);
      setToast({ type: 'success', msg: 'Packing list deleted' });
      if (selectedList?.id === id) setSelectedList(null);
      loadLists();
    } catch { setToast({ type: 'error', msg: 'Error deleting list' }); }
  };

  const toggleOccasion = (occ) => {
    if (form.occasions.includes(occ)) setForm({ ...form, occasions: form.occasions.filter(o => o !== occ) });
    else setForm({ ...form, occasions: [...form.occasions, occ] });
  };

  const renderSuggestions = (suggestions) => {
    if (!suggestions) return null;
    const s = typeof suggestions === 'string' ? (() => { try { return JSON.parse(suggestions); } catch { return null; } })() : suggestions;
    if (!s) return <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', color: '#374151' }}>{String(suggestions)}</pre>;

    return (
      <div>
        {s.essential_items?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ color: '#10b981', marginBottom: 8 }}>✅ Essential Items ({s.essential_items.length})</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {s.essential_items.map((id, i) => <span key={i} className="tag tag-success">Item #{id}</span>)}
            </div>
          </div>
        )}
        {s.optional_items?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ color: '#3b82f6', marginBottom: 8 }}>📦 Optional Items ({s.optional_items.length})</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {s.optional_items.map((id, i) => <span key={i} className="tag tag-info">Item #{id}</span>)}
            </div>
          </div>
        )}
        {s.gaps?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ color: '#f59e0b', marginBottom: 8 }}>⚠️ Packing Gaps</h4>
            {s.gaps.map((gap, i) => (
              <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                <strong style={{ color: '#92400e' }}>{gap.item_type}</strong>
                <p style={{ color: '#78350f', fontSize: 13, margin: '4px 0 0' }}>{gap.reason}</p>
              </div>
            ))}
          </div>
        )}
        {s.total_outfits_possible && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px' }}>
            <strong style={{ color: '#166534' }}>Total Outfits Possible: {s.total_outfits_possible}</strong>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="page-header">
        <div>
          <h1>🧳 Packing Lists</h1>
          <p>AI-generated packing lists for your trips</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Generate Packing List</button>
      </div>

      {selectedList && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>🧳 {selectedList.destination || 'Trip'}</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedList(null)}>✕ Close</button>
          </div>
          <div className="card-body">
            {renderSuggestions(selectedList.ai_suggestions)}
          </div>
        </div>
      )}

      {loading ? (
        <div className="ai-loading"><div className="spinner"></div><p>Loading...</p></div>
      ) : lists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧳</div>
          <p>No packing lists yet. Generate one for your next trip!</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Generate Packing List</button>
        </div>
      ) : (
        <div className="photo-grid">
          {lists.map(list => (
            <div key={list.id} className="item-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedList(list)}>
              <div style={{ fontSize: 40, textAlign: 'center', padding: '20px 0' }}>🧳</div>
              <div className="item-info">
                <div className="item-name">{list.destination || 'Trip'}</div>
                <div className="item-meta">{new Date(list.created_at).toLocaleDateString()}</div>
                {list.occasion_types?.length > 0 && (
                  <div className="item-tags">
                    {list.occasion_types.slice(0, 3).map(occ => <span key={occ} className="tag tag-primary">{occ}</span>)}
                  </div>
                )}
              </div>
              <div style={{ padding: '8px 12px 12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); handleDelete(list.id); }}>🗑️ Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>🧳 Generate Packing List</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleGenerate}>
                <div className="form-group">
                  <label>Destination *</label>
                  <input type="text" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="e.g., Paris, France" required />
                </div>
                <div className="form-group">
                  <label>Travel Dates</label>
                  <input type="text" value={form.dates} onChange={e => setForm({ ...form, dates: e.target.value })} placeholder="e.g., June 15-22, 2025" />
                </div>
                <div className="form-group">
                  <label>Weather Forecast</label>
                  <input type="text" value={form.weather_forecast} onChange={e => setForm({ ...form, weather_forecast: e.target.value })} placeholder="e.g., Hot and humid, 85°F" />
                </div>
                <div className="form-group">
                  <label>Occasions</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                    {OCCASIONS.map(occ => (
                      <label key={occ} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" checked={form.occasions.includes(occ)} onChange={() => toggleOccasion(occ)} />
                        {occ}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="modal-footer" style={{ padding: 0, borderTop: 'none', marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={generating}>
                    {generating ? '🤖 Generating...' : '🤖 Generate with AI'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PackingListPage;
