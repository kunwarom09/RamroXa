'use client';
import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../services/apiClient';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/shop';
  const isFromCheckout = redirect.includes('checkout');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Please enter your email address above to receive a verification link.');
      return;
    }
    setResendLoading(true);
    setResendMessage('');
    try {
      const res = await api.post('/api/auth/resend-verification', {
        email: email.trim().toLowerCase(),
        redirect
      });
      setResendMessage(res?.message || 'A fresh verification link has been sent to your email.');
    } catch (err) {
      setResendMessage(err.message || 'Could not resend email. Please check the address and try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResendMessage('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password
      });

      const token = res?.data?.accessToken || res?.accessToken;
      if (token) {
        localStorage.setItem('zylo_access_token', token);
        document.cookie = `zylo_access_token=${token}; path=/; max-age=86400; SameSite=Lax;`;
      }
      if (res?.data?.user) {
        const u = res.data.user;
        localStorage.setItem('zylo_user', JSON.stringify(u));
        if (u.name) localStorage.setItem('zylo-c-name', u.name);
        if (u.phone) localStorage.setItem('zylo-c-phone', u.phone);
        const addr = u.permanentAddress || u.temporaryAddress || u.address;
        if (addr) localStorage.setItem('zylo-c-address', addr);
      }

      setSuccess(true);
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = redirect;
        } else {
          router.push(redirect);
        }
      }, 300);
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isUnverifiedError = error && (
    error.toLowerCase().includes('verify your email') ||
    error.toLowerCase().includes('verification') ||
    error.toLowerCase().includes('not verified')
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafafa',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#111'
    }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <Link href="/shop" style={{ textDecoration: 'none', color: '#000' }}>
          <span style={{ fontSize: 28, letterSpacing: 6, fontWeight: 700 }}>RAMROXA</span>
        </Link>
        <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>Sign in to your account</p>
      </div>

      <div style={{
        background: '#fff',
        border: '1px solid #e5e5e5',
        borderRadius: 16,
        padding: '36px 32px',
        width: '100%',
        maxWidth: 440,
        boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
      }}>
        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            padding: '14px 16px',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 20,
            lineHeight: 1.5
          }}>
            <div style={{ fontWeight: 600, marginBottom: isUnverifiedError ? 8 : 0 }}>{error}</div>
            {isUnverifiedError && (
              <div style={{ marginTop: 8, borderTop: '1px solid #fee2e2', paddingTop: 8 }}>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  style={{
                    background: '#b91c1c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: resendLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </div>
            )}
          </div>
        )}

        {resendMessage && (
          <div style={{
            background: '#f0fdf4',
            color: '#16a34a',
            border: '1px solid #bbf7d0',
            padding: '12px 16px',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 20,
            lineHeight: 1.5
          }}>
            {resendMessage}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 10px' }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: '#000',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              margin: '0 auto 14px'
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 6px' }}>Signed in successfully</h2>
            <p style={{ color: '#666', fontSize: 13, margin: 0 }}>
              {isFromCheckout ? 'Redirecting you to checkout...' : 'Redirecting you to the store...'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                placeholder="e.g. aarav@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1px solid #d4d4d4',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: '#333' }}>
                  PASSWORD
                </label>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1px solid #d4d4d4',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 44,
                background: loading ? '#888' : '#000',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1.5,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 6,
                transition: 'background 0.15s ease'
              }}
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>
        )}

        {/* Footer Link */}
        <div style={{ marginTop: 24, textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 18, fontSize: 13, color: '#666' }}>
          Don't have an account?{' '}
          <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`} style={{ color: '#000', fontWeight: 600, textDecoration: 'none' }}>
            Create an Account &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        Loading...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
