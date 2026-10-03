import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { login } from '../services/api';

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login(form);
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>👗 AI Wardrobe</h1>
        <p>Sign in to your smart closet</p>
        {error && <div style={{ color: '#ef4444', background: '#fef2f2', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Your password" required />
          </div>
          <button
            type="button"
            onClick={() => { setForm((current) => ({ ...current, email: process.env.REACT_APP_DEMO_EMAIL || '', password: process.env.REACT_APP_DEMO_PASSWORD || '' })); }}
            disabled={!process.env.REACT_APP_DEMO_EMAIL || !process.env.REACT_APP_DEMO_PASSWORD}
            aria-label="Auto Fill Demo Credentials"
            style={{ width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid currentColor', background: 'transparent', cursor: 'pointer' }}
          >
            Auto Fill Demo Credentials
          </button>
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6b7280' }}>
          Don't have an account? <Link to="/register" style={{ color: '#7c3aed', fontWeight: 600 }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
