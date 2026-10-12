import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { login } from '../services/api';

const demoEmail = process.env.REACT_APP_DEMO_EMAIL || '';
const demoPassword = process.env.REACT_APP_DEMO_PASSWORD || '';
const demoCredentialsAvailable = process.env.REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL === 'true'
  && Boolean(demoEmail && demoPassword);

function Login({ onLogin }) {
  const demoLoginLock = useRef(false);
  const [demoLoginBusy, setDemoLoginBusy] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e, demoLoginCredentials) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login((demoLoginCredentials ? { ...form, ...demoLoginCredentials } : form));
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
            onClick={async (event) => {
 if (demoLoginLock.current) return;
 demoLoginLock.current = true; setDemoLoginBusy(true);
 const values = {};
 const captureDemoValue = (key, value) => { values[key] = value; return value; };
 const captureDemoForm = (update) => { const next = typeof update === 'function' ? update(form) : update; values.email = next.email; values.password = next.password; return next; };
 try {
  await (async () => { setForm(captureDemoForm((current) => ({ ...current, email: process.env.REACT_APP_DEMO_EMAIL || '', password: process.env.REACT_APP_DEMO_PASSWORD || '' }))); })(event);
  if (values.error || typeof values.email !== 'string' || !values.email || typeof values.password !== 'string' || !values.password) { setError(typeof values.error === 'string' ? values.error : 'Demo credentials are unavailable.'); return; }
  await handleSubmit(event, { email: values.email, password: values.password });
 } finally { demoLoginLock.current = false; setDemoLoginBusy(false); }
}}
            disabled={loading || demoLoginBusy || !demoCredentialsAvailable}
            aria-label="Log In as Demo"
            style={{ width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid currentColor', background: 'transparent', cursor: 'pointer' }}
          >
            Log In as Demo
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
