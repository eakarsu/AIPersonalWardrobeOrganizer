import AIFieldPresets, { completeExample } from './AIFieldPresets';
import AIResultView from './AIResultView';
import useCancelableAI from './useCancelableAI';
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
  const outfitRequest = useCancelableAI();
  const { result: outfitResult, setResult: setOutfitResult, loading: outfitLoading } = outfitRequest;


  const cpwRequest = useCancelableAI();
  const { result: cpwResult, setResult: setCpwResult, loading: cpwLoading } = cpwRequest;


  const declutterRequest = useCancelableAI();
  const { result: declutterResult, setResult: setDeclutterResult, loading: declutterLoading } = declutterRequest;


  const seasonalRequest = useCancelableAI();
  const { result: seasonalResult, setResult: setSeasonalResult, loading: seasonalLoading } = seasonalRequest;

  const [seasonalForm, setSeasonalForm] = useState({ target_season: 'Summer' });

  const styleRequest = useCancelableAI();
  const { result: styleResult, setResult: setStyleResult, loading: styleLoading } = styleRequest;

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

  const handleOutfitGenerate = async (event) => { event?.preventDefault?.(); return outfitRequest.run(async (options) => (await aiOutfitSuggest(outfitForm, options)).data); };

  const handleCPW = async (event) => { event?.preventDefault?.(); return cpwRequest.run(async (options) => (await aiCostPerWear(options)).data); };

  const handleDeclutter = async (event) => { event?.preventDefault?.(); return declutterRequest.run(async (options) => (await aiDeclutter(options)).data); };

  const handleSeasonalAnalysis = async (event) => { event?.preventDefault?.(); return seasonalRequest.run(async (options) => (await aiSeasonalAnalysis({ target_season: seasonalForm.target_season }, options)).data); };

  const handleStyleProfile = async (event) => { event?.preventDefault?.(); return styleRequest.run(async (options) => (await aiStyleProfile(styleForm, options)).data); };

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
      {outfitLoading || cpwLoading || declutterLoading || seasonalLoading || styleLoading ? <div className="sr-actions"><span role="status">Preparing your OpenRouter report…</span><button type="button" className="btn btn-secondary" onClick={() => { outfitRequest.cancel(); cpwRequest.cancel(); declutterRequest.cancel(); seasonalRequest.cancel(); styleRequest.cancel(); }}>Cancel</button></div> : null}


      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { outfitRequest.cancel(); cpwRequest.cancel(); declutterRequest.cancel(); seasonalRequest.cancel(); styleRequest.cancel(); setActiveTab(tab.id); }}
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
            <><AIFieldPresets fields={[{ key: 'occasion', type: 'select', options: ['Work', 'Casual', 'Date Night', 'Party', 'Gym', 'Travel', 'Wedding', 'Beach', 'Formal Dinner'] }, { key: 'weather', type: 'select', options: ['Hot', 'Warm', 'Mild', 'Cool', 'Cold', 'Rainy'] }, { key: 'mood', type: 'select', options: ['Comfortable', 'Bold', 'Minimalist', 'Classic', 'Trendy', 'Relaxed', 'Professional'] }]} context="outfit" disabled={outfitLoading} onFill={(sample, index) => { setOutfitForm(completeExample([{ key: 'occasion', type: 'select', options: ['Work', 'Casual', 'Date Night', 'Party', 'Gym', 'Travel', 'Wedding', 'Beach', 'Formal Dinner'] }, { key: 'weather', type: 'select', options: ['Hot', 'Warm', 'Mild', 'Cool', 'Cold', 'Rainy'] }, { key: 'mood', type: 'select', options: ['Comfortable', 'Bold', 'Minimalist', 'Classic', 'Trendy', 'Relaxed', 'Professional'] }], sample, index, 'outfit', outfitForm)); setOutfitResult(null); }} />
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
            </form></>
            {outfitLoading && <div className="ai-loading"><div className="spinner"></div><p>AI is styling your outfit...</p></div>}
            <AIResultView result={outfitResult} loading={outfitLoading} error={outfitRequest.error} title="Outfit report" />
          </div>
        </div>
      )}

      {activeTab === 'seasonal' && (
        <div className="card">
          <div className="card-header"><h2>Seasonal Wardrobe Gap Analysis</h2></div>
          <div className="card-body">
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Analyze your wardrobe for the upcoming season and find missing items.</p>
            <><AIFieldPresets fields={[{ key: 'target_season', type: 'select', options: ['Spring', 'Summer', 'Fall', 'Winter'] }]} context="seasonal" disabled={seasonalLoading} onFill={(sample, index) => { setSeasonalForm(completeExample([{ key: 'target_season', type: 'select', options: ['Spring', 'Summer', 'Fall', 'Winter'] }], sample, index, 'seasonal', seasonalForm)); setSeasonalResult(null); }} />
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
            </form></>
            {seasonalLoading && <div className="ai-loading"><div className="spinner"></div><p>Analyzing seasonal wardrobe gaps...</p></div>}
            <AIResultView result={seasonalResult} loading={seasonalLoading} error={seasonalRequest.error} title="Seasonal report" />
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
            <AIResultView result={cpwResult} loading={cpwLoading} error={cpwRequest.error} title="Cost per wear report" />
          </div>
        </div>
      )}

      {activeTab === 'style' && (
        <div className="card">
          <div className="card-header"><h2>AI Style Profile Builder</h2></div>
          <div className="card-body">
            <p style={{ color: '#6b7280', marginBottom: 16 }}>AI will analyze your wardrobe and build a personalized style profile.</p>
            {!styleResult && (
              <><AIFieldPresets fields={[{ key: 'body_type', type: 'select', options: ['Pear', 'Apple', 'Hourglass', 'Rectangle', 'Inverted Triangle', 'Athletic'] }, { key: 'skin_tone', type: 'select', options: ['Fair', 'Light', 'Medium', 'Olive', 'Tan', 'Deep', 'Dark'] }, { key: 'lifestyle', type: 'select', options: ['Corporate Office', 'Creative Work', 'Remote Work', 'Active/Athletic', 'Stay at Home', 'Social/Events'] }, { key: 'preferences', type: 'textarea' }]} context="style" disabled={styleLoading} onFill={(sample, index) => { setStyleForm(completeExample([{ key: 'body_type', type: 'select', options: ['Pear', 'Apple', 'Hourglass', 'Rectangle', 'Inverted Triangle', 'Athletic'] }, { key: 'skin_tone', type: 'select', options: ['Fair', 'Light', 'Medium', 'Olive', 'Tan', 'Deep', 'Dark'] }, { key: 'lifestyle', type: 'select', options: ['Corporate Office', 'Creative Work', 'Remote Work', 'Active/Athletic', 'Stay at Home', 'Social/Events'] }, { key: 'preferences', type: 'textarea' }], sample, index, 'style', styleForm)); setStyleResult(null); }} />
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
              </form></>
            )}
            {styleLoading && <div className="ai-loading"><div className="spinner"></div><p>Building your style profile...</p></div>}
            <AIResultView result={styleResult} loading={styleLoading} error={styleRequest.error} title="Style report" />
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
            <AIResultView result={declutterResult} loading={declutterLoading} error={declutterRequest.error} title="Declutter report" />
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
                <AIResultView result={item.result} title="Saved wardrobe report" />
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
