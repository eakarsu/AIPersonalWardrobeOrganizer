import React, { useEffect, useState } from 'react';
import api from '../services/api';

const palette = ['#5b8def', '#ff6b6b', '#34c759', '#ffb302', '#a06cd5', '#16a3a3', '#e07b00', '#7d8fa8'];

function WardrobeCategoryBreakdownChart() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get('/custom-views/category-breakdown')
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.error || e.message));
  }, []);

  if (err) return <div style={{ color: '#c00', padding: 12 }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 12 }}>Loading category breakdown...</div>;

  const total = data.total || data.categories.reduce((s, c) => s + c.count, 0) || 1;

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 8px 0' }}>Wardrobe Category Breakdown</h3>
      <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: 13 }}>
        Total active items: <strong>{total}</strong>{data.demo ? ' (demo data)' : ''}
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, padding: '0 8px', borderBottom: '1px solid #eee' }}>
        {data.categories.map((c, i) => {
          const pct = Math.round((c.count / total) * 100);
          const h = Math.max(8, Math.round((c.count / Math.max(...data.categories.map(x => x.count))) * 180));
          return (
            <div key={c.category} style={{ flex: 1, textAlign: 'center' }}>
              <div title={`${c.category}: ${c.count} (${pct}%)`}
                   style={{ background: palette[i % palette.length], height: h, borderRadius: '6px 6px 0 0' }} />
              <div style={{ fontSize: 11, marginTop: 4, color: '#333' }}>{c.category}</div>
              <div style={{ fontSize: 10, color: '#888' }}>{c.count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WardrobeCategoryBreakdownChart;
