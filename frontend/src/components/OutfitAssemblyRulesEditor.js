import React, { useEffect, useState } from 'react';
import api from '../services/api';

const SEASONS = ['all', 'spring', 'summer', 'fall', 'winter'];
const FORMALITIES = ['casual', 'business', 'formal', 'athletic'];

function emptyForm() {
  return { name: '', primary_color: '', accent_colors: '', season: 'all', formality: 'casual', notes: '' };
}

function OutfitAssemblyRulesEditor() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get('/custom-views/rules')
      .then(r => setRules(r.data.rules || []))
      .catch(e => setErr(e.response?.data?.error || e.message));
  };

  useEffect(() => { load(); }, []);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    const payload = {
      name: form.name,
      primary_color: form.primary_color,
      accent_colors: form.accent_colors.split(',').map(s => s.trim()).filter(Boolean),
      season: form.season,
      formality: form.formality,
      notes: form.notes
    };
    try {
      if (editingId) {
        await api.put(`/custom-views/rules/${editingId}`, payload);
      } else {
        await api.post('/custom-views/rules', payload);
      }
      setForm(emptyForm()); setEditingId(null); load();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (r) => {
    setEditingId(r.id);
    setForm({
      name: r.name, primary_color: r.primary_color,
      accent_colors: (r.accent_colors || []).join(', '),
      season: r.season || 'all', formality: r.formality || 'casual', notes: r.notes || ''
    });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try { await api.delete(`/custom-views/rules/${id}`); load(); }
    catch (e) { setErr(e.response?.data?.error || e.message); }
  };

  const cancel = () => { setEditingId(null); setForm(emptyForm()); };

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Outfit Assembly Rules</h3>
      <p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>
        Define color-coordination palettes by season + formality. Used when building outfit suggestions.
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
        <input required placeholder="Rule name (e.g. Office Power)" value={form.name} onChange={e => update('name', e.target.value)}
               style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
        <input required placeholder="Primary color (e.g. navy)" value={form.primary_color} onChange={e => update('primary_color', e.target.value)}
               style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
        <input placeholder="Accent colors comma-separated (e.g. white, burgundy)" value={form.accent_colors} onChange={e => update('accent_colors', e.target.value)}
               style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6, gridColumn: 'span 2' }} />
        <select value={form.season} onChange={e => update('season', e.target.value)} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}>
          {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={form.formality} onChange={e => update('formality', e.target.value)} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}>
          {FORMALITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <textarea placeholder="Notes (when to use, exceptions)" value={form.notes} onChange={e => update('notes', e.target.value)}
                  rows={2} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6, gridColumn: 'span 2' }} />
        <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8 }}>
          <button type="submit" disabled={busy}
                  style={{ background: '#5b8def', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }}>
            {editingId ? 'Update rule' : 'Add rule'}
          </button>
          {editingId && <button type="button" onClick={cancel} style={{ background: '#eee', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>}
        </div>
      </form>

      {err && <div style={{ color: '#c00', marginBottom: 8, fontSize: 13 }}>{err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {rules.map(r => (
          <div key={r.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, background: '#fafbff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <strong>{r.name}</strong>
              <div>
                <button onClick={() => edit(r)} style={{ background: 'transparent', border: '1px solid #ccc', borderRadius: 4, padding: '2px 6px', marginRight: 4, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                <button onClick={() => remove(r.id)} style={{ background: 'transparent', border: '1px solid #f0a5a5', color: '#c00', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 12 }}>Delete</button>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
              Primary: <strong>{r.primary_color}</strong>
              <br />Accents: {(r.accent_colors || []).join(', ') || '—'}
              <br />Season: {r.season} · Formality: {r.formality}
            </div>
            {r.notes && <div style={{ fontSize: 12, color: '#444', marginTop: 6, fontStyle: 'italic' }}>{r.notes}</div>}
          </div>
        ))}
        {rules.length === 0 && <div style={{ color: '#888', fontSize: 13 }}>No rules yet — add your first above.</div>}
      </div>
    </div>
  );
}

export default OutfitAssemblyRulesEditor;
