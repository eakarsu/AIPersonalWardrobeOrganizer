import React, { useState } from 'react';
import api from '../services/api';
import Toast from '../components/Toast';

const TABS = [
  { id: 'wear-pattern', label: 'Wear Pattern Analysis' },
  { id: 'weather-pack', label: 'Weather-Aware Pack' },
];

function WardrobeAIAdvancedPage() {
  const [activeTab, setActiveTab] = useState('wear-pattern');
  const [toast, setToast] = useState(null);

  // Wear Pattern Analysis
  const [wpLoading, setWpLoading] = useState(false);
  const [wpResult, setWpResult] = useState(null);
  const [wpForm, setWpForm] = useState({ window_days: 90 });

  // Weather Pack
  const [wpkLoading, setWpkLoading] = useState(false);
  const [wpkResult, setWpkResult] = useState(null);
  const [wpkForm, setWpkForm] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    forecast: '',
    occasions: '',
  });

  const handleWearPattern = async (e) => {
    e.preventDefault();
    setWpLoading(true);
    setWpResult(null);
    try {
      const r = await api.post('/ai/wear-pattern-analysis', {
        window_days: Number(wpForm.window_days) || 90,
      });
      setWpResult(r.data);
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Error analyzing wear patterns' });
    }
    setWpLoading(false);
  };

  const handleWeatherPack = async (e) => {
    e.preventDefault();
    setWpkLoading(true);
    setWpkResult(null);
    try {
      const occasions = wpkForm.occasions
        ? wpkForm.occasions.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const payload = {
        destination: wpkForm.destination,
        start_date: wpkForm.start_date,
        end_date: wpkForm.end_date,
        forecast: wpkForm.forecast,
        occasions,
      };
      const r = await api.post('/ai/weather-pack', payload);
      setWpkResult(r.data);
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Error generating packing strategy' });
    }
    setWpkLoading(false);
  };

  const renderJSON = (obj) => (
    <pre
      style={{
        fontSize: 11,
        color: '#374151',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        padding: 10,
        borderRadius: 8,
        marginTop: 12,
        maxHeight: 360,
        overflow: 'auto',
      }}
    >
      {typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)}
    </pre>
  );

  const renderAIText = (text) => {
    if (!text) return null;
    return (
      <div
        style={{
          background: '#f8fafc',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          padding: 16,
          whiteSpace: 'pre-wrap',
          fontSize: 14,
          lineHeight: 1.7,
          color: '#374151',
          marginTop: 16,
        }}
      >
        {text}
      </div>
    );
  };

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />
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
            onClick={() => setActiveTab(tab.id)}
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
                {wpLoading ? 'Analyzing...' : 'Analyze Patterns'}
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
                        {typeof f === 'string' ? f : JSON.stringify(f)}
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
                        {typeof f === 'string' ? f : JSON.stringify(f)}
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
                {renderAIText(wpResult.content)}
                <details style={{ marginTop: 12 }}>
                  <summary style={{ cursor: 'pointer', color: '#6b7280', fontSize: 12 }}>Raw response</summary>
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
                {wpkLoading ? 'Building Pack...' : 'Generate Packing Strategy'}
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
                        {typeof layer === 'string' ? layer : JSON.stringify(layer)}
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
                        {typeof risk === 'string' ? risk : JSON.stringify(risk)}
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
                        {typeof gap === 'string' ? gap : JSON.stringify(gap)}
                      </div>
                    ))}
                  </div>
                )}
                {renderAIText(wpkResult.content)}
                <details style={{ marginTop: 12 }}>
                  <summary style={{ cursor: 'pointer', color: '#6b7280', fontSize: 12 }}>Raw response</summary>
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
