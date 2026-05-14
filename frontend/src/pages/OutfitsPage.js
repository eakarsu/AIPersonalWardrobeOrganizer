import React, { useState, useEffect, useCallback } from 'react';
import { getOutfits, createOutfit, updateOutfit, deleteOutfit, logOutfitWear, getWardrobeItems } from '../services/api';
import Toast from '../components/Toast';

const OCCASIONS = ['Casual', 'Work', 'Date Night', 'Party', 'Formal Event', 'Sport', 'Travel', 'Other'];
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'All Season'];

function OutfitsPage() {
  const [outfits, setOutfits] = useState([]);
  const [wardrobeItems, setWardrobeItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [editOutfit, setEditOutfit] = useState(null);
  const [form, setForm] = useState({ name: '', occasion: '', season: '', item_ids: [], notes: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [outfitsRes, itemsRes] = await Promise.all([
        getOutfits(),
        getWardrobeItems({ limit: 200 })
      ]);
      setOutfits(outfitsRes.data.outfits || []);
      setWardrobeItems(itemsRes.data.items || []);
    } catch (err) {
      setOutfits([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openNew = () => {
    setForm({ name: '', occasion: '', season: '', item_ids: [], notes: '' });
    setEditOutfit(null);
    setShowModal(true);
  };

  const openEdit = (outfit) => {
    setForm({
      name: outfit.name || '', occasion: outfit.occasion || '',
      season: outfit.season || '', item_ids: outfit.item_ids || [], notes: outfit.notes || ''
    });
    setEditOutfit(outfit);
    setShowModal(true);
    setSelectedOutfit(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editOutfit) {
        await updateOutfit(editOutfit.id, form);
        setToast({ type: 'success', msg: 'Outfit updated!' });
      } else {
        await createOutfit(form);
        setToast({ type: 'success', msg: 'Outfit saved!' });
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Error saving outfit' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this outfit?')) return;
    try {
      await deleteOutfit(id);
      setToast({ type: 'success', msg: 'Outfit deleted' });
      setSelectedOutfit(null);
      loadData();
    } catch (err) {
      setToast({ type: 'error', msg: 'Error deleting outfit' });
    }
  };

  const handleLogWear = async (id) => {
    try {
      await logOutfitWear(id, {});
      setToast({ type: 'success', msg: 'Outfit wear logged!' });
      loadData();
    } catch (err) {
      setToast({ type: 'error', msg: 'Error logging wear' });
    }
  };

  const toggleItem = (id) => {
    setForm(prev => ({
      ...prev,
      item_ids: prev.item_ids.includes(id)
        ? prev.item_ids.filter(x => x !== id)
        : [...prev.item_ids, id]
    }));
  };

  const apiBase = process.env.REACT_APP_API_URL?.replace('/api', '') || '';

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="page-header">
        <div><h1>✨ Outfits</h1><p>{outfits.length} saved outfits</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ New Outfit</button>
      </div>

      {loading ? (
        <div className="ai-loading"><div className="spinner"></div><p>Loading outfits...</p></div>
      ) : outfits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✨</div>
          <p>No outfits yet. Create your first outfit combination!</p>
          <button className="btn btn-primary" onClick={openNew}>+ Create Outfit</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {outfits.map(outfit => {
            const outfitItems = wardrobeItems.filter(i => (outfit.item_ids || []).includes(i.id));
            return (
              <div key={outfit.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setSelectedOutfit(outfit)}>
                <div style={{ padding: 16 }}>
                  {outfitItems.length > 0 ? (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                      {outfitItems.slice(0, 4).map(item => (
                        <div key={item.id} style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.image_url
                            ? <img src={`${apiBase}${item.image_url}`} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 28 }}>👔</span>}
                        </div>
                      ))}
                      {outfitItems.length > 4 && <div style={{ width: 60, height: 60, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#6b7280' }}>+{outfitItems.length - 4}</div>}
                    </div>
                  ) : (
                    <div style={{ height: 60, display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 36 }}>✨</span>
                    </div>
                  )}
                  <h3 style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>{outfit.name}</h3>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                    {outfit.occasion && <span>{outfit.occasion} • </span>}
                    {outfit.season && <span>{outfit.season} • </span>}
                    <span>{(outfit.item_ids || []).length} items</span>
                  </div>
                  {outfit.wear_count > 0 && (
                    <div style={{ marginTop: 8 }}><span className="tag tag-success">Worn {outfit.wear_count}x</span></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedOutfit && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedOutfit(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{selectedOutfit.name}</h2>
              <button className="close-btn" onClick={() => setSelectedOutfit(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[['Occasion', selectedOutfit.occasion], ['Season', selectedOutfit.season], ['Worn', `${selectedOutfit.wear_count || 0} times`]].filter(([,v]) => v).map(([l,v]) => (
                  <div key={l} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>{l}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Items in Outfit</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {wardrobeItems.filter(i => (selectedOutfit.item_ids || []).includes(i.id)).map(item => (
                  <div key={item.id} style={{ background: '#f9fafb', borderRadius: 8, padding: '6px 10px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {item.image_url
                      ? <img src={`${apiBase}${item.image_url}`} alt={item.name} style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
                      : <span>👔</span>}
                    {item.name}
                  </div>
                ))}
              </div>
              {selectedOutfit.notes && <p style={{ color: '#6b7280', fontSize: 14 }}>{selectedOutfit.notes}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-success btn-sm" onClick={() => handleLogWear(selectedOutfit.id)}>✅ Log Wear</button>
              <button className="btn btn-primary btn-sm" onClick={() => openEdit(selectedOutfit)}>✏️ Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedOutfit.id)}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2>{editOutfit ? 'Edit Outfit' : 'New Outfit'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Outfit Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Business Casual Monday" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Occasion</label>
                    <select value={form.occasion} onChange={e => setForm({ ...form, occasion: e.target.value })}>
                      <option value="">Select...</option>
                      {OCCASIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Season</label>
                    <select value={form.season} onChange={e => setForm({ ...form, season: e.target.value })}>
                      <option value="">Select...</option>
                      {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Select Items ({form.item_ids.length} selected)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, maxHeight: 260, overflowY: 'auto', padding: '4px 0' }}>
                    {wardrobeItems.map(item => (
                      <div key={item.id}
                        onClick={() => toggleItem(item.id)}
                        style={{
                          border: form.item_ids.includes(item.id) ? '2px solid #7c3aed' : '2px solid #e5e7eb',
                          borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: form.item_ids.includes(item.id) ? '#f5f3ff' : 'white'
                        }}>
                        {item.image_url
                          ? <img src={`${apiBase}${item.image_url}`} alt={item.name} style={{ width: '100%', height: 60, objectFit: 'cover' }} />
                          : <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👔</div>}
                        <div style={{ padding: '4px 6px', fontSize: 11, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Style notes, accessories, etc." />
                </div>
                <div className="modal-footer" style={{ padding: 0, borderTop: 'none' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editOutfit ? 'Update' : 'Save Outfit'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OutfitsPage;
