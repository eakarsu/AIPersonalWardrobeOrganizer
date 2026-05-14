import React, { useState, useEffect } from 'react';
import { aiOutfitSuggest, aiDeclutter, aiCostPerWear, aiSeasonalAnalysis, aiStyleProfile, getAIHistory } from '../services/api';
import Toast from '../components/Toast';

const TABS = [
  { id: 'outfit', label: 'Outfit Generator' },
  { id: 'seasonal', label: 'Seasonal Analysis' },
  { id: 'cpw', label: 'Cost-Per-Wear' },
  { id: 'style', label: 'Style Profile' },
  { id: 'declutter', label: 'Declutter' },
  { id: 'history', label: 'AI History' },
];

function AIPage() {
  const [activeTab, setActiveTab] = useState('outfit');
  const [toast, setToast] = useState(null);

  const [outfitForm, setOutfitForm] = useState({ occasion: '', weather: '', mood: '' });
  const [outfitResult, setOutfitResult] = useState(null);
  const [outfitLoading, setOutfitLoading] = useState(false);

  const [cpwResult, setCpwResult] = useState(null);
  const [cpwLoading, setCpwLoading] = useState(false);

  const [declutterResult, setDeclutterResult] = useState(null);
  const [declutterLoading, setDeclutterLoading] = useState(false);

  const [seasonalResult, setSeasonalResult] = useState(null);
  const [seasonalLoading, setSeasonalLoading] = useState(false);
  const [seasonalForm, setSeasonalForm] = useState({ target_season: 'Summer' });

  const [styleResult, setStyleResult] = useState(null);
  const [styleLoading, setStyleLoading] = useState(false);
  const [styleForm, setStyleForm] = useState({ body_type: '', skin_tone: '', lifestyle: '', preferences: '' });

  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histPage, setHistPage] = useState(1);
  const [histTotal, setHistTotal] = useState(0);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, histPage]);

  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const r = await getAIHistory({ page: histPage, limit: 20 });
      setHistory(r.data.analyses || []);
      setHistTotal(r.data.total || 0);
    } catch { setHistory([]); }
    setHistLoading(false);
  };

  const handleOutfitGenerate = async (e) => {
    e.preventDefault();
    setOutfitLoading(true);
    try {
      const r = await aiOutfitSuggest(outfitForm);
      setOutfitResult(r.data);
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Error generating outfit' });
    }
    setOutfitLoading(false);
  };

  const handleCPW = async () => {
    setCpwLoading(true);
    try {
      const r = await aiCostPerWear();
      setCpwResult(r.data);
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Error analyzing cost-per-wear' });
    }
    setCpwLoading(false);
  };

  const handleDeclutter = async () => {
    setDeclutterLoading(true);
    try {
      const r = await aiDeclutter();
      setDeclutterResult(r.data);
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Error analyzing wardrobe' });
    }
    setDeclutterLoading(false);
  };

  const handleSeasonalAnalysis = async (e) => {
    e.preventDefault();
    setSeasonalLoading(true);
    try {
      const r = await aiSeasonalAnalysis({ target_season: seasonalForm.target_season });
      setSeasonalResult(r.data);
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Error analyzing seasonal gaps' });
    }
    setSeasonalLoading(false);
  };

  const handleStyleProfile = async (e) => {
    e.preventDefault();
    setStyleLoading(true);
    try {
      const r = await aiStyleProfile(styleForm);
      setStyleResult(r.data);
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Error building style profile' });
    }
    setStyleLoading(false);
  };

  const renderAIText = (text) => {
    if (!text) return null;
    return (
      <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16, whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, color: '#374151', marginTop: 16 }}>
        {text}
      </div>
    );
  };

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="page-header">
        <div>
          <h1>AI Stylist</h1>
          <p>AI-powered wardrobe intelligence</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeTab === tab.id ? '#7c3aed' : '#fff',
              borderColor: activeTab === tab.id ? '#7c3aed' : '#d1d5db',
              color: activeTab === tab.id ? '#fff' : '#374151'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'outfit' && (
        <div className="card">
          <div className="card-header"><h2>Outfit Generator</h2></div>
          <div className="card-body">
            <form onSubmit={handleOutfitGenerate}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                <div className="form-group">
                  <label>Occasion</label>
                  <select value={outfitForm.occasion} onChange={e => setOutfitForm({ ...outfitForm, occasion: e.target.value })}>
                    <option value="">Any occasion</option>
                    {['Work', 'Casual', 'Date Night', 'Party', 'Gym', 'Travel', 'Wedding', 'Beach', 'Formal Dinner'].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Weather</label>
                  <select value={outfitForm.weather} onChange={e => setOutfitForm({ ...outfitForm, weather: e.target.value })}>
                    <option value="">Any weather</option>
                    {['Hot', 'Warm', 'Mild', 'Cool', 'Cold', 'Rainy'].map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Mood / Style</label>
                  <select value={outfitForm.mood} onChange={e => setOutfitForm({ ...outfitForm, mood: e.target.value })}>
                    <option value="">Any mood</option>
                    {['Comfortable', 'Bold', 'Minimalist', 'Classic', 'Trendy', 'Relaxed', 'Professional'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={outfitLoading} style={{ marginTop: 8 }}>
                {outfitLoading ? 'Generating...' : 'Generate Outfit'}
              </button>
            </form>
            {outfitLoading && <div className="ai-loading"><div className="spinner"></div><p>AI is styling your outfit...</p></div>}
            {outfitResult && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ marginBottom: 12 }}>Your AI-Generated Outfit</h3>
                {outfitResult.parsed?.outfit?.map((item, i) => (
                  <div key={i} style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '10px 14px', marginBottom: 6 }}>
                    <strong style={{ color: '#5b21b6' }}>Item #{item.item_id}</strong>
                    {item.reason && <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>{item.reason}</p>}
                  </div>
                ))}
                {outfitResult.parsed?.style_notes && (
                  <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                    <strong>Style Notes: </strong>{outfitResult.parsed.style_notes}
                  </div>
                )}
                {renderAIText(outfitResult.content)}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'seasonal' && (
        <div className="card">
          <div className="card-header"><h2>Seasonal Wardrobe Gap Analysis</h2></div>
          <div className="card-body">
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Analyze your wardrobe for the upcoming season and find missing items.</p>
            <form onSubmit={handleSeasonalAnalysis} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
              <div className="form-group" style={{ margin: 0, flex: 1 }}>
                <label>Target Season</label>
                <select value={seasonalForm.target_season} onChange={e => setSeasonalForm({ target_season: e.target.value })}>
                  {['Spring', 'Summer', 'Fall', 'Winter'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={seasonalLoading}>
                {seasonalLoading ? 'Analyzing...' : `Analyze ${seasonalForm.target_season}`}
              </button>
            </form>
            {seasonalLoading && <div className="ai-loading"><div className="spinner"></div><p>Analyzing seasonal wardrobe gaps...</p></div>}
            {seasonalResult && (
              <div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#166534' }}>{seasonalResult.parsed?.season_readiness_score ?? '-'}/10</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Readiness Score</div>
                  </div>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8' }}>{seasonalResult.seasonItemCount ?? 0}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Seasonal Items</div>
                  </div>
                </div>
                {seasonalResult.parsed?.gap_items?.map((gap, i) => (
                  <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                    <strong style={{ color: '#92400e' }}>{gap.category}</strong>
                    <span style={{ float: 'right', fontSize: 11, fontWeight: 700, color: gap.priority === 'high' ? '#dc2626' : '#d97706' }}>{gap.priority}</span>
                    <p style={{ color: '#78350f', fontSize: 13, margin: '2px 0 0' }}>{gap.reason}</p>
                  </div>
                ))}
                {seasonalResult.parsed?.seasonal_recommendations?.map((rec, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#374151', padding: '4px 0' }}>- {rec}</div>
                ))}
                {renderAIText(seasonalResult.content)}
                <button className="btn btn-secondary btn-sm" onClick={() => setSeasonalResult(null)} style={{ marginTop: 12 }}>Re-analyze</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'cpw' && (
        <div className="card">
          <div className="card-header"><h2>Cost-Per-Wear Analytics</h2></div>
          <div className="card-body">
            <p style={{ color: '#6b7280', marginBottom: 16 }}>See which items give the best value for money.</p>
            {!cpwResult && (
              <button className="btn btn-primary" onClick={handleCPW} disabled={cpwLoading}>
                {cpwLoading ? 'Analyzing...' : 'Analyze Cost-Per-Wear'}
              </button>
            )}
            {cpwLoading && <div className="ai-loading"><div className="spinner"></div><p>Calculating cost-per-wear...</p></div>}
            {cpwResult && (
              <div>
                {cpwResult.items?.length > 0 && (
                  <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          {['Name', 'Category', 'Price', 'Wears', 'Cost/Wear'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cpwResult.items.sort((a, b) => (parseFloat(a.cost_per_wear) || 9999) - (parseFloat(b.cost_per_wear) || 9999)).map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{item.name}</td>
                            <td style={{ padding: '8px 12px', color: '#6b7280' }}>{item.category}</td>
                            <td style={{ padding: '8px 12px' }}>${item.purchase_price || '-'}</td>
                            <td style={{ padding: '8px 12px' }}>{item.wear_count || 0}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: item.cost_per_wear ? (parseFloat(item.cost_per_wear) < 5 ? '#10b981' : parseFloat(item.cost_per_wear) < 20 ? '#f59e0b' : '#ef4444') : '#9ca3af' }}>
                              {item.cost_per_wear ? `$${item.cost_per_wear}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {cpwResult.parsed?.high_value_items?.length > 0 && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 14, marginBottom: 12 }}>
                    <h4 style={{ color: '#166534', marginBottom: 8 }}>Best Value Items</h4>
                    {cpwResult.parsed.high_value_items.map((item, i) => (
                      <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>- {typeof item === 'string' ? item : JSON.stringify(item)}</div>
                    ))}
                  </div>
                )}
                {cpwResult.parsed?.recommendations?.length > 0 && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 14, marginBottom: 12 }}>
                    <h4 style={{ color: '#1d4ed8', marginBottom: 8 }}>Recommendations</h4>
                    {cpwResult.parsed.recommendations.map((rec, i) => (
                      <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>- {typeof rec === 'string' ? rec : JSON.stringify(rec)}</div>
                    ))}
                  </div>
                )}
                {renderAIText(cpwResult.content)}
                <button className="btn btn-secondary btn-sm" onClick={() => setCpwResult(null)} style={{ marginTop: 12 }}>Re-analyze</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'style' && (
        <div className="card">
          <div className="card-header"><h2>AI Style Profile Builder</h2></div>
          <div className="card-body">
            <p style={{ color: '#6b7280', marginBottom: 16 }}>AI will analyze your wardrobe and build a personalized style profile.</p>
            {!styleResult && (
              <form onSubmit={handleStyleProfile}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                  <div className="form-group">
                    <label>Body Type</label>
                    <select value={styleForm.body_type} onChange={e => setStyleForm({ ...styleForm, body_type: e.target.value })}>
                      <option value="">Select...</option>
                      {['Pear', 'Apple', 'Hourglass', 'Rectangle', 'Inverted Triangle', 'Athletic'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Skin Tone</label>
                    <select value={styleForm.skin_tone} onChange={e => setStyleForm({ ...styleForm, skin_tone: e.target.value })}>
                      <option value="">Select...</option>
                      {['Fair', 'Light', 'Medium', 'Olive', 'Tan', 'Deep', 'Dark'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Lifestyle</label>
                    <select value={styleForm.lifestyle} onChange={e => setStyleForm({ ...styleForm, lifestyle: e.target.value })}>
                      <option value="">Select...</option>
                      {['Corporate Office', 'Creative Work', 'Remote Work', 'Active/Athletic', 'Stay at Home', 'Social/Events'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Style Preferences</label>
                  <textarea value={styleForm.preferences} onChange={e => setStyleForm({ ...styleForm, preferences: e.target.value })} rows={2} placeholder="e.g., I love minimalist looks, prefer neutral tones..." />
                </div>
                <button type="submit" className="btn btn-primary" disabled={styleLoading}>
                  {styleLoading ? 'Building Profile...' : 'Build My Style Profile'}
                </button>
              </form>
            )}
            {styleLoading && <div className="ai-loading"><div className="spinner"></div><p>Building your style profile...</p></div>}
            {styleResult && (
              <div>
                {styleResult.parsed?.style_personality && (
                  <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: 16, marginBottom: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase' }}>Your Style Personality</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#1f2937', marginTop: 4 }}>{styleResult.parsed.style_personality}</div>
                    {styleResult.parsed.core_aesthetic && <div style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>{styleResult.parsed.core_aesthetic}</div>}
                  </div>
                )}
                {styleResult.parsed?.recommended_color_palette?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ marginBottom: 8 }}>Your Color Palette</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {styleResult.parsed.recommended_color_palette.map((color, i) => (
                        <span key={i} className="tag tag-secondary">{color}</span>
                      ))}
                    </div>
                  </div>
                )}
                {styleResult.parsed?.capsule_essentials?.map((item, i) => (
                  <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                    <strong style={{ fontSize: 13 }}>{item.item || JSON.stringify(item)}</strong>
                    {item.why && <p style={{ color: '#6b7280', fontSize: 12, margin: '2px 0 0' }}>{item.why}</p>}
                  </div>
                ))}
                {styleResult.parsed?.style_rules?.map((rule, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#374151', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>- {rule}</div>
                ))}
                {renderAIText(styleResult.content)}
                <button className="btn btn-secondary btn-sm" onClick={() => setStyleResult(null)} style={{ marginTop: 12 }}>Rebuild Profile</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'declutter' && (
        <div className="card">
          <div className="card-header"><h2>Declutter Assistant</h2></div>
          <div className="card-body">
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Find items you have not worn in 90+ days. AI will suggest what to donate or sell.</p>
            {!declutterResult && (
              <button className="btn btn-primary" onClick={handleDeclutter} disabled={declutterLoading}>
                {declutterLoading ? 'Analyzing...' : 'Analyze for Decluttering'}
              </button>
            )}
            {declutterLoading && <div className="ai-loading"><div className="spinner"></div><p>Finding items to declutter...</p></div>}
            {declutterResult && (
              <div>
                {declutterResult.itemCount !== undefined && (
                  <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <strong>Found {declutterResult.itemCount} items not worn in 90+ days</strong>
                  </div>
                )}
                {declutterResult.parsed?.donate_candidates?.map((item, i) => (
                  <div key={i} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                    <strong style={{ color: '#991b1b' }}>Item #{item.item_id}</strong>
                    {item.resale_potential && <span style={{ float: 'right' }} className="tag tag-warning">{item.resale_potential}</span>}
                    <p style={{ color: '#374151', fontSize: 13, margin: '4px 0 0' }}>{item.reason}</p>
                  </div>
                ))}
                {declutterResult.parsed?.estimated_resale_value !== undefined && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    <strong>Estimated Resale Value: ${declutterResult.parsed.estimated_resale_value}</strong>
                  </div>
                )}
                {renderAIText(declutterResult.content)}
                <button className="btn btn-secondary btn-sm" onClick={() => setDeclutterResult(null)} style={{ marginTop: 12 }}>Re-analyze</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header"><h2>AI Analysis History</h2></div>
          <div className="card-body">
            {histLoading && <div className="ai-loading"><div className="spinner"></div><p>Loading history...</p></div>}
            {!histLoading && history.length === 0 && (
              <div className="empty-state"><div className="empty-icon">-</div><p>No AI analyses yet.</p></div>
            )}
            {history.map(item => (
              <div key={item.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: '#7c3aed', fontSize: 13 }}>{item.endpoint}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(item.created_at).toLocaleString()}</span>
                </div>
                <pre style={{ fontSize: 11, color: '#374151', whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto', margin: 0, background: '#fff', padding: 8, borderRadius: 6 }}>
                  {typeof item.result === 'string' ? item.result : JSON.stringify(item.result, null, 2)}
                </pre>
              </div>
            ))}
            {histTotal > 20 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                <button className="btn btn-secondary btn-sm" disabled={histPage === 1} onClick={() => setHistPage(p => p - 1)}>Prev</button>
                <span style={{ fontSize: 13, padding: '4px 8px' }}>Page {histPage}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setHistPage(p => p + 1)}>Next</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AIPage;
