import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../services/api';

function Register({ onLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await register(form);
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>👗 Join AI Wardrobe</h1>
        <p>Create your smart closet account</p>
        {error && <div style={{ color: '#ef4444', background: '#fef2f2', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Choose a password" required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6b7280' }}>
          Already have an account? <Link to="/login" style={{ color: '#7c3aed', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
