'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../services/apiClient';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState('');
  const [redirect, setRedirect] = useState('/shop');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const urlToken = p.get('token') || searchParams?.get('token') || '';
      const urlRedirect = p.get('redirect') || searchParams?.get('redirect') || '/shop';
      setToken(urlToken);
      setRedirect(urlRedirect);
      if (!urlToken) {
        setError('No password reset token was found. Please request a new password reset link.');
      }
    }
  }, [searchParams]);

  // Validation checks
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isMatch = password && confirmPassword && password === confirmPassword;
  const isStrong = hasMinLength && hasLetter && hasNumber && hasSpecial;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!token) {
      setError('Password reset token is missing. Please request a new link.');
      return;
    }

    if (!isStrong) {
      setError('Password does not meet all security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/api/auth/reset-password', {
        token,
        password
      });

      // Save credentials for immediate automatic login
      const tokenVal = res?.data?.accessToken || res?.accessToken;
      if (tokenVal) {
        localStorage.setItem('zylo_access_token', tokenVal);
        localStorage.setItem('zylo_admin_token', tokenVal);
        document.cookie = `zylo_access_token=${tokenVal}; path=/; max-age=86400; SameSite=Lax;`;
      }

      const userObj = res?.data?.user || res?.user;
      if (userObj) {
        localStorage.setItem('zylo_user', JSON.stringify(userObj));
        if (userObj.name) localStorage.setItem('zylo-c-name', userObj.name);
        if (userObj.phone) localStorage.setItem('zylo-c-phone', userObj.phone);
        const addr = userObj.permanentAddress || userObj.temporaryAddress || userObj.address;
        if (addr) localStorage.setItem('zylo-c-address', addr);
      }

      const targetDest = res?.data?.redirect || redirect || '/shop';
      setIsSuccess(true);

      // Broadcast storage change to other tabs/components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('zylo:auth-change', { detail: { user: userObj, token: tokenVal } }));
      }

      // Auto redirect after brief confirmation
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = targetDest;
        } else {
          router.push(targetDest);
        }
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

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
        <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>Create New Password</p>
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
            <div style={{ fontWeight: 600 }}>{error}</div>
            {(!token || error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid')) && (
              <div style={{ marginTop: 8, borderTop: '1px solid #fee2e2', paddingTop: 8 }}>
                <Link
                  href="/forgot-password"
                  style={{
                    display: 'inline-block',
                    background: '#b91c1c',
                    color: '#fff',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  Request New Reset Link &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '16px 6px' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#000',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              margin: '0 auto 16px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>Password Reset Complete!</h2>
            <p style={{ color: '#16a34a', fontSize: 14, fontWeight: 500, margin: '0 0 16px' }}>
              Your password has been updated and you are now signed in.
            </p>
            <p style={{ color: '#666', fontSize: 13, margin: '0 0 20px' }}>
              Redirecting you to continue...
            </p>
            <Link
              href={redirect || '/shop'}
              style={{
                display: 'inline-block',
                background: '#000',
                color: '#fff',
                textDecoration: 'none',
                padding: '12px 28px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1
              }}
            >
              CONTINUE &rarr;
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* New Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: '#333' }}>
                  NEW PASSWORD
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    fontSize: 11,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter new strong password"
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

            {/* Confirm New Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                CONFIRM NEW PASSWORD
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

            {/* Password Requirements Checklist */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 12
            }}>
              <div style={{ fontWeight: 600, color: '#475569', marginBottom: 6 }}>Password Requirements:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ color: hasMinLength ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{hasMinLength ? '✓' : '○'}</span> At least 8 characters
                </div>
                <div style={{ color: hasLetter ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{hasLetter ? '✓' : '○'}</span> At least 1 letter (a-z, A-Z)
                </div>
                <div style={{ color: hasNumber ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{hasNumber ? '✓' : '○'}</span> At least 1 number (0-9)
                </div>
                <div style={{ color: hasSpecial ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{hasSpecial ? '✓' : '○'}</span> At least 1 special character (!@#$%^&*)
                </div>
                {confirmPassword && (
                  <div style={{ color: isMatch ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{isMatch ? '✓' : '✕'}</span> Passwords match
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !token || !isStrong || (confirmPassword && !isMatch)}
              style={{
                width: '100%',
                height: 44,
                background: (loading || !token || !isStrong || (confirmPassword && !isMatch)) ? '#9ca3af' : '#000',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1.5,
                cursor: (loading || !token || !isStrong || (confirmPassword && !isMatch)) ? 'not-allowed' : 'pointer',
                marginTop: 4,
                transition: 'background 0.15s ease'
              }}
            >
              {loading ? 'RESETTING PASSWORD...' : 'SET NEW PASSWORD'}
            </button>
          </form>
        )}

        {/* Footer Link */}
        <div style={{ marginTop: 24, textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 18, fontSize: 13, color: '#666' }}>
          Back to{' '}
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} style={{ color: '#000', fontWeight: 600, textDecoration: 'none' }}>
            Sign In &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        Loading...
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
