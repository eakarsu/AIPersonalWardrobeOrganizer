import React, { useState } from 'react';

function WardrobeInventoryPDF() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const download = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const token = localStorage.getItem('token');
      const base = process.env.REACT_APP_API_URL || '/api';
      const res = await fetch(`${base}/custom-views/inventory-pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 120)}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wardrobe_inventory.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsg('Inventory PDF downloaded.');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Wardrobe Inventory PDF</h3>
      <p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>
        Generate a printable PDF of every active wardrobe item, grouped by category, with brand, size, price, and wear stats.
      </p>
      <button onClick={download} disabled={busy}
              style={{ background: '#5b8def', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: busy ? 0.7 : 1 }}>
        {busy ? 'Building PDF...' : 'Download Inventory PDF'}
      </button>
      {msg && <div style={{ color: '#0a7f2e', marginTop: 8, fontSize: 13 }}>{msg}</div>}
      {err && <div style={{ color: '#c00', marginTop: 8, fontSize: 13 }}>Error: {err}</div>}
    </div>
  );
}

export default WardrobeInventoryPDF;
