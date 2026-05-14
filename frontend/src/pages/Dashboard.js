import React, { useState, useEffect } from 'react';
import { getStats } from '../services/api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats().then(r => {
      setStats(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div>
      <div className="page-header"><div><h1>Dashboard</h1><p>Your wardrobe overview</p></div></div>
      <div className="ai-loading"><div className="spinner"></div><p>Loading stats...</p></div>
    </div>
  );

  const categoryColors = ['#7c3aed', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>👗 Dashboard</h1>
          <p>Your wardrobe at a glance</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👔</div>
          <div className="stat-value">{stats?.totalItems || 0}</div>
          <div className="stat-label">Wardrobe Items</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✨</div>
          <div className="stat-value">{stats?.totalOutfits || 0}</div>
          <div className="stat-label">Saved Outfits</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{stats?.totalWearLogs || 0}</div>
          <div className="stat-label">Times Worn</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">${stats?.avgCostPerWear || '0.00'}</div>
          <div className="stat-label">Avg Cost/Wear</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💎</div>
          <div className="stat-value">${parseFloat(stats?.totalWardrobeValue || 0).toLocaleString()}</div>
          <div className="stat-label">Wardrobe Value</div>
        </div>
      </div>

      {stats?.categoriesBreakdown?.length > 0 && (
        <div className="card">
          <div className="card-header"><h2>👗 Items by Category</h2></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {stats.categoriesBreakdown.map((cat, i) => (
                <div key={cat.category} style={{ background: `${categoryColors[i % categoryColors.length]}15`, borderRadius: 10, padding: '14px 16px', borderLeft: `4px solid ${categoryColors[i % categoryColors.length]}` }}>
                  <div style={{ fontWeight: 700, fontSize: 20, color: categoryColors[i % categoryColors.length] }}>{cat.count}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{cat.category || 'Uncategorized'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {stats?.totalItems === 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">👗</div>
              <p>Your wardrobe is empty! Start by adding some items.</p>
              <a href="/wardrobe" className="btn btn-primary">+ Add First Item</a>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { href: '/wardrobe', icon: '📷', label: 'Upload Items', desc: 'Add clothing with photos' },
          { href: '/ai', icon: '🤖', label: 'AI Stylist', desc: 'Get outfit suggestions' },
          { href: '/ai#packing', icon: '🧳', label: 'Packing Helper', desc: 'Plan your travel outfits' },
          { href: '/ai#declutter', icon: '♻️', label: 'Declutter', desc: 'Find items to donate' },
        ].map(action => (
          <a key={action.href} href={action.href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
              <div className="card-body" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{action.icon}</div>
                <div style={{ fontWeight: 700, color: '#1f2937' }}>{action.label}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{action.desc}</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
