'use client';
import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../services/apiClient';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams ? searchParams.get('redirect') || '/admin/dashboard' : '/admin/dashboard';

  const [email, setEmail] = useState('admin@zylo.com.np');
  const [password, setPassword] = useState('AdminPassword123!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/api/auth/admin/login', { email, password });
      const token = res?.data?.accessToken || res?.accessToken;
      if (token) {
        localStorage.setItem('zylo_access_token', token);
        localStorage.setItem('zylo_admin_token', token);
        document.cookie = `zylo_access_token=${token}; path=/; max-age=86400; SameSite=Lax;`;
      }
      window.location.href = redirectTarget;
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-card">
      <div className="brand"><img src="/assets/ramroxa-logo.png" alt="Ramroxa" style={{ height: 24 }} /></div>
      <h2>Sign in to admin</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="admin@zylo.com.np"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
            <Link
              href="/forgot-password?redirect=/admin/dashboard"
              style={{ fontSize: '12px', color: 'var(--primary, #2563eb)', textDecoration: 'none' }}
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {errorMsg && (
          <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>
            {errorMsg}
          </div>
        )}
        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in to Dashboard'}
        </button>
      </form>
      <div style={{ marginTop: '16px', padding: '10px', background: 'var(--muted, #f5f5f4)', borderRadius: '6px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
        <strong>Demo Admin Credentials:</strong><br />
        Email: <code style={{ userSelect: 'all' }}>admin@zylo.com.np</code><br />
        Password: <code style={{ userSelect: 'all' }}>AdminPassword123!</code>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="login-card">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
