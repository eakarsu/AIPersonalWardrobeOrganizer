import useNativeAIRequest from '../components/useNativeAIRequest';
import NativeAIControls from '../components/NativeAIControls';
import ReadableAIReport from "./AIResultView";
import React, { useState } from 'react';
import api from '../services/api';

const TABS = [
  { id: 'wear-pattern', label: 'Wear Pattern Analysis' },
  { id: 'weather-pack', label: 'Weather-Aware Pack' },
];

function WardrobeAIAdvancedPage() {
  const [activeTab, setActiveTab] = useState('wear-pattern');


  // Wear Pattern Analysis
  const wearRequest = useNativeAIRequest(); const { loading: wpLoading, result: wpResult, setResult: setWpResult } = wearRequest;

  const [wpForm, setWpForm] = useState({ window_days: 90 });

  // Weather Pack
  const weatherRequest = useNativeAIRequest(); const { loading: wpkLoading, result: wpkResult, setResult: setWpkResult } = weatherRequest;

  const [wpkForm, setWpkForm] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    forecast: '',
    occasions: '',
  });

  const handleWearPattern = async (event) => { event?.preventDefault(); await wearRequest.run(async options => (await api.post('/ai/wear-pattern-analysis',{ window_days: Number(wpForm.window_days) || 90 },options)).data); };

  const handleWeatherPack = async event => { event.preventDefault(); await weatherRequest.run(async options => (await api.post('/ai/weather-pack',{ ...wpkForm, occasions: wpkForm.occasions.split(',').map(value=>value.trim()).filter(Boolean) },options)).data); };

  const renderJSON = (obj) => (
    <ReadableAIReport result={obj} />
  );

  const renderAIText = text => text ? <ReadableAIReport result={text} /> : null;

  const completePresets = ['City business trip','Cool-weather walking','Warm coastal break'].map((label,index) => ({ label, values: { window_days: [30,90,180][index], destination: ['Chicago','Edinburgh','Lisbon'][index], start_date: '2026-11-08', end_date: ['2026-11-11','2026-11-14','2026-11-18'][index], forecast: ['Example forecast: 5–12 C, rain possible; verify before travel.','Example forecast: 3–9 C, wind and showers; verify before travel.','Example forecast: 16–22 C, mild evenings; verify before travel.'][index], occasions: ['Client meetings, dinner','Walking tour, casual dinner','Beach walk, restaurant, museum'][index] } }));
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Insights+</h1>
          <p>Wear-pattern intelligence and weather-aware packing</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { wearRequest.cancel(); weatherRequest.cancel(); setActiveTab(tab.id); }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: activeTab === tab.id ? '#7c3aed' : '#fff',
              borderColor: activeTab === tab.id ? '#7c3aed' : '#d1d5db',
              color: activeTab === tab.id ? '#fff' : '#374151',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <NativeAIControls request={activeTab === 'wear-pattern' ? wearRequest : weatherRequest} presets={completePresets} onFill={values => { if (activeTab === 'wear-pattern') setWpForm({ window_days: values.window_days }); else setWpkForm({ destination: values.destination, start_date: values.start_date, end_date: values.end_date, forecast: values.forecast, occasions: values.occasions }); }} />
      {activeTab === 'wear-pattern' && (
        <div className="card">
          <div className="card-header">
            <h2>Wear Pattern Analysis</h2>
          </div>
          <div className="card-body">
            <p style={{ color: '#6b7280', marginBottom: 16 }}>
              Identify favorite pieces, underused items, and rotation diversity from your wear log.
            </p>
            <form
              onSubmit={handleWearPattern}
              style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}
            >
              <div className="form-group" style={{ margin: 0, flex: 1, maxWidth: 220 }}>
                <label>Window (days)</label>
                <input
                  type="number"
                  min="7"
                  max="365"
                  value={wpForm.window_days}
                  onChange={(e) => setWpForm({ window_days: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={wpLoading}>
                {wpLoading ? 'Analyzing...' : 'Generate with OpenRouter'}
              </button>
            </form>
            {wpLoading && (
              <div className="ai-loading">
                <div className="spinner"></div>
                <p>Analyzing your wear patterns...</p>
              </div>
            )}
            {wpResult && (
              <div>
                {wpResult.parsed?.rotation_diversity_score !== undefined && (
                  <div
                    style={{
                      background: '#f5f3ff',
                      border: '1px solid #ddd6fe',
                      borderRadius: 10,
                      padding: 14,
                      marginBottom: 16,
                      display: 'flex',
                      gap: 16,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase' }}>
                        Rotation Diversity
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#1f2937' }}>
                        {wpResult.parsed.rotation_diversity_score}
                      </div>
                    </div>
                  </div>
                )}
                {wpResult.parsed?.favorites?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ marginBottom: 8 }}>Favorites</h4>
                    {wpResult.parsed.favorites.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderRadius: 8,
                          padding: '8px 12px',
                          marginBottom: 6,
                        }}
                      >
                        {typeof f === 'string' ? f : <ReadableAIReport result={f} />}
                      </div>
                    ))}
                  </div>
                )}
                {wpResult.parsed?.underused?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ marginBottom: 8 }}>Underused</h4>
                    {wpResult.parsed.underused.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fca5a5',
                          borderRadius: 8,
                          padding: '8px 12px',
                          marginBottom: 6,
                        }}
                      >
                        {typeof f === 'string' ? f : <ReadableAIReport result={f} />}
                      </div>
                    ))}
                  </div>
                )}
                {wpResult.parsed?.category_balance && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ marginBottom: 8 }}>Category Balance</h4>
                    {renderJSON(wpResult.parsed.category_balance)}
                  </div>
                )}
                <ReadableAIReport result={wpResult} title="Wardrobe analysis report" />
                <details style={{ marginTop: 12 }}>
                  <summary style={{ cursor: 'pointer', color: '#6b7280', fontSize: 12 }}>Complete report</summary>
                  {renderJSON(wpResult)}
                </details>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setWpResult(null)}
                  style={{ marginTop: 12 }}
                >
                  Re-analyze
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'weather-pack' && (
        <div className="card">
          <div className="card-header">
            <h2>Weather-Aware Packing</h2>
          </div>
          <div className="card-body">
            <p style={{ color: '#6b7280', marginBottom: 16 }}>
              Generate a packing strategy with layering plans, weather risks, and gaps.
            </p>
            <form onSubmit={handleWeatherPack}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 16,
                }}
              >
                <div className="form-group">
                  <label>Destination</label>
                  <input
                    type="text"
                    placeholder="e.g., Paris, France"
                    value={wpkForm.destination}
                    onChange={(e) => setWpkForm({ ...wpkForm, destination: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={wpkForm.start_date}
                    onChange={(e) => setWpkForm({ ...wpkForm, start_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={wpkForm.end_date}
                    onChange={(e) => setWpkForm({ ...wpkForm, end_date: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Forecast Summary</label>
                  <textarea
                    rows={2}
                    placeholder="e.g., Highs 18-22C, lows 8-10C, scattered showers days 2-3"
                    value={wpkForm.forecast}
                    onChange={(e) => setWpkForm({ ...wpkForm, forecast: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Occasions (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g., business meetings, dinner out, walking tour"
                    value={wpkForm.occasions}
                    onChange={(e) => setWpkForm({ ...wpkForm, occasions: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={wpkLoading} style={{ marginTop: 8 }}>
                {wpkLoading ? 'Building Pack...' : 'Generate with OpenRouter'}
              </button>
            </form>
            {wpkLoading && (
              <div className="ai-loading">
                <div className="spinner"></div>
                <p>AI is building your weather-aware pack...</p>
              </div>
            )}
            {wpkResult && (
              <div style={{ marginTop: 16 }}>
                {wpkResult.parsed?.packing_strategy && (
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 10,
                      padding: 14,
                      marginBottom: 12,
                    }}
                  >
                    <h4 style={{ color: '#1d4ed8', marginBottom: 8 }}>Strategy</h4>
                    <div style={{ fontSize: 13, color: '#374151' }}>
                      {typeof wpkResult.parsed.packing_strategy === 'string'
                        ? wpkResult.parsed.packing_strategy
                        : renderJSON(wpkResult.parsed.packing_strategy)}
                    </div>
                  </div>
                )}
                {wpkResult.parsed?.layering?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ marginBottom: 8 }}>Layering Plan</h4>
                    {wpkResult.parsed.layering.map((layer, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          padding: '8px 12px',
                          marginBottom: 6,
                          fontSize: 13,
                        }}
                      >
                        {typeof layer === 'string' ? layer : <ReadableAIReport result={layer} />}
                      </div>
                    ))}
                  </div>
                )}
                {wpkResult.parsed?.weather_risks?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ marginBottom: 8 }}>Weather Risks</h4>
                    {wpkResult.parsed.weather_risks.map((risk, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: 8,
                          padding: '8px 12px',
                          marginBottom: 6,
                          fontSize: 13,
                          color: '#78350f',
                        }}
                      >
                        {typeof risk === 'string' ? risk : <ReadableAIReport result={risk} />}
                      </div>
                    ))}
                  </div>
                )}
                {wpkResult.parsed?.gaps?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ marginBottom: 8 }}>Wardrobe Gaps</h4>
                    {wpkResult.parsed.gaps.map((gap, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fca5a5',
                          borderRadius: 8,
                          padding: '8px 12px',
                          marginBottom: 6,
                          fontSize: 13,
                          color: '#991b1b',
                        }}
                      >
                        {typeof gap === 'string' ? gap : <ReadableAIReport result={gap} />}
                      </div>
                    ))}
                  </div>
                )}
                <ReadableAIReport result={wpkResult} title="Wardrobe analysis report" />
                <details style={{ marginTop: 12 }}>
                  <summary style={{ cursor: 'pointer', color: '#6b7280', fontSize: 12 }}>Complete report</summary>
                  {renderJSON(wpkResult)}
                </details>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setWpkResult(null)}
                  style={{ marginTop: 12 }}
                >
                  Build Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WardrobeAIAdvancedPage;
