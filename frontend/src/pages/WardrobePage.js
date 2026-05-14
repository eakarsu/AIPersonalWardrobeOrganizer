import React, { useState, useEffect, useCallback } from 'react';
import { getWardrobeItems, createWardrobeItem, updateWardrobeItem, deleteWardrobeItem, logWear, aiAutoTagPhoto } from '../services/api';
import Toast from '../components/Toast';

const CATEGORIES = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Activewear', 'Formal', 'Sleepwear', 'Other'];
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'All Season'];
const FORMALITIES = ['Casual', 'Smart Casual', 'Business Casual', 'Business Formal', 'Formal', 'Activewear', 'Loungewear'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

const EMOJI_MAP = { Tops: '👕', Bottoms: '👖', Dresses: '👗', Outerwear: '🧥', Shoes: '👟', Accessories: '💍', Activewear: '🏃', Formal: '🎩', Sleepwear: '😴', Other: '👔' };

function WardrobePage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [filters, setFilters] = useState({ category: '', formality: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [aiTagging, setAiTagging] = useState(false);
  const [form, setForm] = useState({
    name: '', category: '', color: '', material: '', pattern: '',
    season: [], formality: '', brand: '', size: '',
    purchase_price: '', purchase_date: '', condition: '', notes: ''
  });

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getWardrobeItems({ ...filters, limit: 100 });
      setItems(r.data.items || []);
      setTotal(r.data.total || 0);
    } catch (err) {
      setItems([]);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const openNew = () => {
    setForm({ name: '', category: '', color: '', material: '', pattern: '', season: [], formality: '', brand: '', size: '', purchase_price: '', purchase_date: '', condition: '', notes: '' });
    setPhotoFile(null);
    setEditItem(null);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setForm({
      name: item.name || '', category: item.category || '', color: item.color || '',
      material: item.material || '', pattern: item.pattern || '',
      season: item.season || [], formality: item.formality || '',
      brand: item.brand || '', size: item.size || '',
      purchase_price: item.purchase_price || '', purchase_date: item.purchase_date || '',
      condition: item.condition || '', notes: item.notes || ''
    });
    setPhotoFile(null);
    setEditItem(item);
    setShowModal(true);
    setSelectedItem(null);
  };

  const handleAutoTag = async () => {
    if (!photoFile) return;
    setAiTagging(true);
    const fd = new FormData();
    fd.append('photo', photoFile);
    try {
      const r = await aiAutoTagPhoto(fd);
      const parsed = r.data.parsed || {};
      setForm(prev => ({
        ...prev,
        category: parsed.category || prev.category,
        color: parsed.color || prev.color,
        material: parsed.material || prev.material,
        pattern: parsed.pattern || prev.pattern,
        season: parsed.season || prev.season,
        formality: parsed.formality || prev.formality,
        condition: parsed.condition || prev.condition,
      }));
      setToast({ type: 'success', msg: 'AI auto-tagged your item!' });
    } catch (err) {
      setToast({ type: 'error', msg: 'Auto-tag failed' });
    }
    setAiTagging(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach(val => fd.append(k, val));
      else if (v !== '') fd.append(k, v);
    });
    if (photoFile) fd.append('photo', photoFile);

    try {
      if (editItem) {
        await updateWardrobeItem(editItem.id, fd);
        setToast({ type: 'success', msg: 'Item updated!' });
      } else {
        await createWardrobeItem(fd);
        setToast({ type: 'success', msg: 'Item added to wardrobe!' });
      }
      setShowModal(false);
      setEditItem(null);
      loadItems();
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Error saving item' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await deleteWardrobeItem(id);
      setToast({ type: 'success', msg: 'Item deleted' });
      setSelectedItem(null);
      loadItems();
    } catch (err) {
      setToast({ type: 'error', msg: 'Error deleting item' });
    }
  };

  const handleLogWear = async (id) => {
    try {
      await logWear(id, {});
      setToast({ type: 'success', msg: 'Wear logged!' });
      loadItems();
      if (selectedItem?.id === id) setSelectedItem(prev => ({ ...prev, wear_count: (prev.wear_count || 0) + 1 }));
    } catch (err) {
      setToast({ type: 'error', msg: 'Error logging wear' });
    }
  };

  const filteredItems = items.filter(item => {
    if (filters.category && item.category !== filters.category) return false;
    if (filters.formality && item.formality !== filters.formality) return false;
    return true;
  });

  const apiBase = process.env.REACT_APP_API_URL?.replace('/api', '') || '';

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="page-header">
        <div>
          <h1>👔 My Wardrobe</h1>
          <p>{total} items in your closet</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Upload Item</button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.formality} onChange={e => setFilters({ ...filters, formality: e.target.value })}>
          <option value="">All Formality</option>
          {FORMALITIES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <span style={{ fontSize: 13, color: '#9ca3af' }}>{filteredItems.length} items</span>
      </div>

      {/* Photo Grid */}
      {loading ? (
        <div className="ai-loading"><div className="spinner"></div><p>Loading wardrobe...</p></div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👗</div>
          <p>No items yet. Start by uploading your first clothing item!</p>
          <button className="btn btn-primary" onClick={openNew}>+ Upload Item</button>
        </div>
      ) : (
        <div className="photo-grid">
          {filteredItems.map(item => (
            <div key={item.id} className="item-card" onClick={() => setSelectedItem(item)}>
              {item.image_url ? (
                <img src={`${apiBase}${item.image_url}`} alt={item.name} className="item-image" />
              ) : (
                <div className="item-image">{EMOJI_MAP[item.category] || '👔'}</div>
              )}
              <div className="item-info">
                <div className="item-name">{item.name}</div>
                <div className="item-meta">
                  {item.brand && <span>{item.brand} • </span>}
                  {item.color && <span>{item.color} • </span>}
                  {item.size && <span>Size {item.size}</span>}
                </div>
                <div className="item-tags">
                  {item.category && <span className="tag tag-primary">{item.category}</span>}
                  {item.formality && <span className="tag tag-gray">{item.formality}</span>}
                  {item.wear_count > 0 && <span className="tag tag-success">Worn {item.wear_count}x</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedItem(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{selectedItem.name}</h2>
              <button className="close-btn" onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              {selectedItem.image_url ? (
                <img src={`${apiBase}${selectedItem.image_url}`} alt={selectedItem.name} className="image-preview" style={{ marginBottom: 16 }} />
              ) : (
                <div className="no-image-placeholder" style={{ marginBottom: 16 }}>{EMOJI_MAP[selectedItem.category] || '👔'}</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  ['Category', selectedItem.category], ['Brand', selectedItem.brand],
                  ['Color', selectedItem.color], ['Material', selectedItem.material],
                  ['Size', selectedItem.size], ['Formality', selectedItem.formality],
                  ['Condition', selectedItem.condition], ['Pattern', selectedItem.pattern],
                  ['Price', selectedItem.purchase_price ? `$${selectedItem.purchase_price}` : null],
                  ['Worn', `${selectedItem.wear_count || 0} times`],
                  ['Last Worn', selectedItem.last_worn],
                  ['Cost/Wear', selectedItem.purchase_price && selectedItem.wear_count > 0
                    ? `$${(parseFloat(selectedItem.purchase_price) / selectedItem.wear_count).toFixed(2)}`
                    : null]
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: 14, color: '#1f2937', fontWeight: 600, marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
              {selectedItem.season?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>SEASONS</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selectedItem.season.map(s => <span key={s} className="tag tag-info">{s}</span>)}
                  </div>
                </div>
              )}
              {selectedItem.auto_tags && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>AI TAGS</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(selectedItem.auto_tags.suggested_tags || []).map(t => <span key={t} className="tag tag-secondary">{t}</span>)}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-success btn-sm" onClick={() => handleLogWear(selectedItem.id)}>✅ Log Wear</button>
              <button className="btn btn-primary btn-sm" onClick={() => openEdit(selectedItem)}>✏️ Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedItem.id)}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editItem ? 'Edit Item' : '+ Upload Item'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Photo Upload */}
              <div className="form-group">
                <label>Photo</label>
                <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} />
                {photoFile && (
                  <div style={{ marginTop: 8 }}>
                    <img src={URL.createObjectURL(photoFile)} alt="preview" style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover' }} />
                    <button type="button" className="btn btn-info btn-sm btn-full" style={{ marginTop: 8 }} onClick={handleAutoTag} disabled={aiTagging}>
                      {aiTagging ? '🔄 AI Tagging...' : '🤖 Auto-Tag with AI'}
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Blue Oxford Shirt" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      <option value="">Select...</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Color</label>
                    <input type="text" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="e.g., Navy Blue" />
                  </div>
                  <div className="form-group">
                    <label>Brand</label>
                    <input type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="e.g., Zara" />
                  </div>
                  <div className="form-group">
                    <label>Size</label>
                    <input type="text" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} placeholder="e.g., M, L, 32" />
                  </div>
                  <div className="form-group">
                    <label>Material</label>
                    <input type="text" value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} placeholder="e.g., Cotton" />
                  </div>
                  <div className="form-group">
                    <label>Pattern</label>
                    <input type="text" value={form.pattern} onChange={e => setForm({ ...form, pattern: e.target.value })} placeholder="e.g., Solid, Stripe" />
                  </div>
                  <div className="form-group">
                    <label>Formality</label>
                    <select value={form.formality} onChange={e => setForm({ ...form, formality: e.target.value })}>
                      <option value="">Select...</option>
                      {FORMALITIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Condition</label>
                    <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
                      <option value="">Select...</option>
                      {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Purchase Price ($)</label>
                    <input type="number" step="0.01" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Purchase Date</label>
                    <input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Seasons</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {SEASONS.map(s => (
                      <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" checked={form.season.includes(s)} onChange={e => {
                          if (e.target.checked) setForm({ ...form, season: [...form.season, s] });
                          else setForm({ ...form, season: form.season.filter(x => x !== s) });
                        }} />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="modal-footer" style={{ padding: 0, borderTop: 'none', marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editItem ? 'Update Item' : 'Add to Wardrobe'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WardrobePage;
