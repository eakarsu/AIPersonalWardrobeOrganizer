import React, { useEffect, useState } from 'react';
import api from '../services/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function cellColor(v, max) {
  if (!v) return '#f3f4f6';
  const ratio = Math.min(1, v / Math.max(1, max));
  // blue scale
  const r = Math.round(225 - ratio * 175);
  const g = Math.round(238 - ratio * 130);
  const b = Math.round(255 - ratio * 60);
  return `rgb(${r},${g},${b})`;
}

function WearFrequencyHeatmap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    api.get('/custom-views/wear-heatmap', { params: { year } })
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.error || e.message));
  }, [year]);

  if (err) return <div style={{ color: '#c00', padding: 12 }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 12 }}>Loading wear heatmap...</div>;

  const max = Math.max(1, ...data.items.flatMap(it => it.months));

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Wear Frequency Heatmap</h3>
        <div>
          <label style={{ fontSize: 12, marginRight: 6 }}>Year</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: 13 }}>
        Items shown: <strong>{data.items.length}</strong>{data.demo ? ' (demo data)' : ''}. Darker = worn more often.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: '#444' }}>Item</th>
              {MONTHS.map(m => <th key={m} style={{ padding: '4px 6px', color: '#666', fontWeight: 600 }}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.items.map(it => (
              <tr key={it.item_id}>
                <td style={{ padding: '4px 8px', color: '#222', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</td>
                {it.months.map((v, m) => (
                  <td key={m}
                      title={`${MONTHS[m]}: ${v} wears`}
                      style={{ width: 32, height: 24, background: cellColor(v, max), border: '1px solid #fff', textAlign: 'center', color: v > max * 0.6 ? '#fff' : '#333' }}>
                    {v || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default WearFrequencyHeatmap;
