'use client';
import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '../../services/apiClient';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || '/shop';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setResendMessage('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/api/auth/forgot-password', {
        email: email.trim().toLowerCase(),
        redirect
      });

      setSubmittedEmail(email.trim().toLowerCase());
      setIsSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!submittedEmail) return;
    setResendLoading(true);
    setResendMessage('');
    setError('');

    try {
      const res = await api.post('/api/auth/forgot-password', {
        email: submittedEmail,
        redirect
      });
      setResendMessage('A fresh password reset link has been dispatched to your email.');
    } catch (err) {
      setResendMessage(err.message || 'Could not resend email. Please try again.');
    } finally {
      setResendLoading(false);
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
        <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>
          {isSuccess ? 'Password Reset Request' : 'Forgot your password?'}
        </p>
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
            ✓ {resendMessage}
          </div>
        )}

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '12px 6px' }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: '#000',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              margin: '0 auto 16px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
            }}>
              ✉
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>Check Your Email</h2>
            <p style={{ color: '#555', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 20px' }}>
              If an account is associated with <strong>{submittedEmail}</strong>, we've sent instructions to reset your password.
            </p>

            <p style={{ color: '#888', fontSize: 12, lineHeight: 1.4, margin: '0 0 24px' }}>
              Didn't receive the email? Check your spam folder or click below to request another link.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                style={{
                  width: '100%',
                  height: 42,
                  background: '#f3f4f6',
                  color: '#111',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: resendLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {resendLoading ? 'SENDING...' : 'RESEND RESET EMAIL'}
              </button>

              <Link
                href={`/login?redirect=${encodeURIComponent(redirect)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 42,
                  background: '#000',
                  color: '#fff',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: 1,
                  textDecoration: 'none',
                  marginTop: 4
                }}
              >
                BACK TO SIGN IN &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ margin: '0 0 4px', color: '#555', fontSize: 13.5, lineHeight: 1.5 }}>
              Enter the email address registered with your account and we'll send you a link to reset your password.
            </p>

            {/* Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                autoFocus
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
              {loading ? 'SENDING LINK...' : 'SEND RESET LINK'}
            </button>
          </form>
        )}

        {/* Footer Link */}
        <div style={{ marginTop: 24, textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 18, fontSize: 13, color: '#666' }}>
          Remember your password?{' '}
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} style={{ color: '#000', fontWeight: 600, textDecoration: 'none' }}>
            Sign In &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        Loading...
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}
