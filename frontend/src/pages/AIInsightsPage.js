import React, { useState } from 'react';
import api from '../services/api';
import Toast from '../components/Toast';

const TABS = [
  { id: 'wear', label: 'Wear Pattern Analysis' },
  { id: 'weather', label: 'Weather Pack' },
];

function AIInsightsPage() {
  const [activeTab, setActiveTab] = useState('wear');
  const [toast, setToast] = useState(null);

  const [wearLoading, setWearLoading] = useState(false);
  const [wearResult, setWearResult] = useState(null);

  const [weatherForm, setWeatherForm] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    forecast: '',
    occasions: '',
  });
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherResult, setWeatherResult] = useState(null);

  const handleWear = async () => {
    setWearLoading(true);
    setWearResult(null);
    try {
      const r = await api.post('/ai/wear-pattern-analysis', {});
      setWearResult(r.data);
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Error analyzing wear patterns' });
    }
    setWearLoading(false);
  };

  const handleWeather = async (e) => {
    e.preventDefault();
    setWeatherLoading(true);
    setWeatherResult(null);
    try {
      const payload = {
        destination: weatherForm.destination,
        start_date: weatherForm.start_date,
        end_date: weatherForm.end_date,
        forecast: weatherForm.forecast,
        occasions: weatherForm.occasions
          ? weatherForm.occasions.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      };
      const r = await api.post('/ai/weather-pack', payload);
      setWeatherResult(r.data);
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Error generating weather pack' });
    }
    setWeatherLoading(false);
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
          <h1>AI Insights</h1>
          <p>Wear patterns and weather-aware packing</p>
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

      {activeTab === 'wear' && (
        <div className="card">
          <div className="card-header"><h2>Wear Pattern Analysis</h2></div>
          <div className="card-body">
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Identify favorite pieces and unused items based on your wear logs.</p>
            {!wearResult && (
              <button className="btn btn-primary" onClick={handleWear} disabled={wearLoading}>
                {wearLoading ? 'Analyzing...' : 'Analyze Wear Patterns'}
              </button>
            )}
            {wearLoading && <div className="ai-loading"><div className="spinner"></div><p>Analyzing wear patterns...</p></div>}
            {wearResult && (
              <div>
                {wearResult.parsed?.rotation_diversity_score !== undefined && (
                  <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    <strong>Rotation Diversity Score: </strong>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#5b21b6' }}>
                      {wearResult.parsed.rotation_diversity_score}
                    </span>
                  </div>
                )}
                {Array.isArray(wearResult.parsed?.favorites) && wearResult.parsed.favorites.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ marginBottom: 8 }}>Favorites</h4>
                    {wearResult.parsed.favorites.map((f, i) => (
                      <div key={i} style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 13 }}>
                        {typeof f === 'string' ? f : (f.name || `Item #${f.item_id}`)}
                        {f.reason && <p style={{ color: '#374151', margin: '2px 0 0' }}>{f.reason}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {Array.isArray(wearResult.parsed?.underused) && wearResult.parsed.underused.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ marginBottom: 8 }}>Underused</h4>
                    {wearResult.parsed.underused.map((u, i) => (
                      <div key={i} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 13 }}>
                        {typeof u === 'string' ? u : (u.name || `Item #${u.item_id}`)}
                        {u.reason && <p style={{ color: '#374151', margin: '2px 0 0' }}>{u.reason}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {wearResult.parsed?.category_balance && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    <h4 style={{ marginBottom: 6 }}>Category Balance</h4>
                    <pre style={{ fontSize: 12, margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(wearResult.parsed.category_balance, null, 2)}</pre>
                  </div>
                )}
                {renderAIText(wearResult.content)}
                <button className="btn btn-secondary btn-sm" onClick={() => setWearResult(null)} style={{ marginTop: 12 }}>Re-analyze</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'weather' && (
        <div className="card">
          <div className="card-header"><h2>Weather-Aware Packing</h2></div>
          <div className="card-body">
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Build a packing strategy with layering and gap notes for your trip.</p>
            <form onSubmit={handleWeather}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                <div className="form-group">
                  <label>Destination</label>
                  <input type="text" value={weatherForm.destination} onChange={e => setWeatherForm({ ...weatherForm, destination: e.target.value })} placeholder="Paris, France" />
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={weatherForm.start_date} onChange={e => setWeatherForm({ ...weatherForm, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={weatherForm.end_date} onChange={e => setWeatherForm({ ...weatherForm, end_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Forecast (free text)</label>
                <textarea rows={2} value={weatherForm.forecast} onChange={e => setWeatherForm({ ...weatherForm, forecast: e.target.value })} placeholder="e.g., 50-65F, light rain on day 2" />
              </div>
              <div className="form-group">
                <label>Occasions (comma-separated)</label>
                <input type="text" value={weatherForm.occasions} onChange={e => setWeatherForm({ ...weatherForm, occasions: e.target.value })} placeholder="business meeting, dinner, sightseeing" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={weatherLoading}>
                {weatherLoading ? 'Building...' : 'Build Weather Pack'}
              </button>
            </form>
            {weatherLoading && <div className="ai-loading"><div className="spinner"></div><p>Building weather pack...</p></div>}
            {weatherResult && (
              <div style={{ marginTop: 16 }}>
                {Array.isArray(weatherResult.parsed?.layering_strategy) && weatherResult.parsed.layering_strategy.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ marginBottom: 8 }}>Layering Strategy</h4>
                    {weatherResult.parsed.layering_strategy.map((s, i) => (
                      <div key={i} style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 13 }}>
                        {typeof s === 'string' ? s : JSON.stringify(s)}
                      </div>
                    ))}
                  </div>
                )}
                {Array.isArray(weatherResult.parsed?.weather_risks) && weatherResult.parsed.weather_risks.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ marginBottom: 8 }}>Weather Risks</h4>
                    {weatherResult.parsed.weather_risks.map((r, i) => (
                      <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 13 }}>
                        {typeof r === 'string' ? r : JSON.stringify(r)}
                      </div>
                    ))}
                  </div>
                )}
                {Array.isArray(weatherResult.parsed?.gaps) && weatherResult.parsed.gaps.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ marginBottom: 8 }}>Gaps</h4>
                    {weatherResult.parsed.gaps.map((g, i) => (
                      <div key={i} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 13 }}>
                        {typeof g === 'string' ? g : JSON.stringify(g)}
                      </div>
                    ))}
                  </div>
                )}
                {renderAIText(weatherResult.content)}
                <button className="btn btn-secondary btn-sm" onClick={() => setWeatherResult(null)} style={{ marginTop: 12 }}>Reset</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AIInsightsPage;
