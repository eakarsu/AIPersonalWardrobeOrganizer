import useNativeAIRequest from '../components/useNativeAIRequest';
import NativeAIControls from '../components/NativeAIControls';
import ReadableAIReport from "./AIResultView";
import React, { useState } from 'react';
import api from '../services/api';

const TABS = [
  { id: 'wear', label: 'Wear Pattern Analysis' },
  { id: 'weather', label: 'Weather Pack' },
];

function AIInsightsPage() {
  const [activeTab, setActiveTab] = useState('wear');


  const wearRequest = useNativeAIRequest(); const { loading: wearLoading, result: wearResult, setResult: setWearResult } = wearRequest;


  const [weatherForm, setWeatherForm] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    forecast: '',
    occasions: '',
  });
  const weatherRequest = useNativeAIRequest(); const { loading: weatherLoading, result: weatherResult, setResult: setWeatherResult } = weatherRequest;


  const [wearForm,setWearForm] = useState({ window_days: 90 });
  const handleWear = async (event) => { event?.preventDefault(); await wearRequest.run(async options => (await api.post('/ai/wear-pattern-analysis',{ window_days: Number(wearForm.window_days) || 90 },options)).data); };

  const handleWeather = async event => { event.preventDefault(); await weatherRequest.run(async options => (await api.post('/ai/weather-pack',{ ...weatherForm, occasions: weatherForm.occasions.split(',').map(value=>value.trim()).filter(Boolean) },options)).data); };

  const renderAIText = text => text ? <ReadableAIReport result={text} /> : null;

  const completePresets = ['City business trip','Cool-weather walking','Warm coastal break'].map((label,index) => ({ label, values: { window_days: [30,90,180][index], destination: ['Chicago','Edinburgh','Lisbon'][index], start_date: '2026-11-08', end_date: ['2026-11-11','2026-11-14','2026-11-18'][index], forecast: ['Example forecast: 5–12 C, rain possible; verify before travel.','Example forecast: 3–9 C, wind and showers; verify before travel.','Example forecast: 16–22 C, mild evenings; verify before travel.'][index], occasions: ['Client meetings, dinner','Walking tour, casual dinner','Beach walk, restaurant, museum'][index] } }));
  return (
    <div>
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
            onClick={() => { wearRequest.cancel(); weatherRequest.cancel(); setActiveTab(tab.id); }}
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

      <NativeAIControls request={activeTab === 'wear' ? wearRequest : weatherRequest} presets={completePresets} onFill={values => { if (activeTab === 'wear') setWearForm({ window_days: values.window_days }); else setWeatherForm({ destination: values.destination, start_date: values.start_date, end_date: values.end_date, forecast: values.forecast, occasions: values.occasions }); }} />
      {activeTab === 'wear' && (
        <div className="card">
          <div className="card-header"><h2>Wear Pattern Analysis</h2></div>
          <div className="card-body">
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Identify favorite pieces and unused items based on your wear logs.</p>
            <label>Lookback window (days)<input type="number" min="7" max="365" value={wearForm.window_days} disabled={wearLoading} onChange={event=>setWearForm({window_days:event.target.value})} /></label>
            {!wearResult && (
              <button className="btn btn-primary" onClick={handleWear} disabled={wearLoading}>
                {wearLoading ? 'Analyzing...' : 'Generate with OpenRouter'}
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
                    <ReadableAIReport result={wearResult.parsed.category_balance} />
                  </div>
                )}
                <ReadableAIReport result={wearResult} title="Wardrobe analysis report" />
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
                {weatherLoading ? 'Building...' : 'Generate with OpenRouter'}
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
                        {typeof s === 'string' ? s : <ReadableAIReport result={s} />}
                      </div>
                    ))}
                  </div>
                )}
                {Array.isArray(weatherResult.parsed?.weather_risks) && weatherResult.parsed.weather_risks.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ marginBottom: 8 }}>Weather Risks</h4>
                    {weatherResult.parsed.weather_risks.map((r, i) => (
                      <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 13 }}>
                        {typeof r === 'string' ? r : <ReadableAIReport result={r} />}
                      </div>
                    ))}
                  </div>
                )}
                {Array.isArray(weatherResult.parsed?.gaps) && weatherResult.parsed.gaps.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ marginBottom: 8 }}>Gaps</h4>
                    {weatherResult.parsed.gaps.map((g, i) => (
                      <div key={i} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 13 }}>
                        {typeof g === 'string' ? g : <ReadableAIReport result={g} />}
                      </div>
                    ))}
                  </div>
                )}
                <ReadableAIReport result={weatherResult} title="Wardrobe analysis report" />
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
