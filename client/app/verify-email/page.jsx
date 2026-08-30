'use client';
import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../services/apiClient';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const redirect = searchParams.get('redirect') || '/checkout';

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token was found in the link. Please check your email or request a new link.');
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const res = await api.post('/api/auth/verify-email', { token });
        if (!isMounted) return;

        if (res?.data?.user) {
          localStorage.setItem('zylo_user', JSON.stringify(res.data.user));
        }

        setStatus('success');

        // Redirect back to checkout (or specified redirect) after short celebratory pause
        setTimeout(() => {
          router.push(redirect);
        }, 1500);
      } catch (err) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage(err.message || 'Verification link is invalid or has expired.');
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token, redirect, router]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendLoading(true);
    setResendSuccess('');
    try {
      const res = await api.post('/api/auth/resend-verification', {
        email: resendEmail.trim().toLowerCase(),
        redirect
      });
      setResendSuccess(res.message || 'A fresh verification link has been sent to your email.');
    } catch (err) {
      setResendSuccess('');
      setErrorMessage(err.message || 'Could not send verification email. Please check the address.');
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
        <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>Email Verification</p>
      </div>

      <div style={{
        background: '#fff',
        border: '1px solid #e5e5e5',
        borderRadius: 16,
        padding: '40px 32px',
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
        textAlign: 'center'
      }}>
        {/* State: Verifying */}
        {status === 'verifying' && (
          <div>
            <div style={{
              width: 56,
              height: 56,
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #000',
              borderRadius: '50%',
              margin: '0 auto 20px',
              animation: 'spin 0.8s linear infinite'
            }} />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 10px' }}>Verifying Your Email...</h2>
            <p style={{ color: '#666', fontSize: 14, margin: 0 }}>Please hold on while we confirm your account details.</p>
          </div>
        )}

        {/* State: Success */}
        {status === 'success' && (
          <div>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: '#000',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              margin: '0 auto 20px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Email Verified!</h2>
            <p style={{ color: '#16a34a', fontSize: 14, fontWeight: 500, margin: '0 0 16px' }}>
              Your account is active and verified.
            </p>
            <p style={{ color: '#666', fontSize: 13, margin: '0 0 24px' }}>
              Redirecting you back to complete your checkout with your saved cart...
            </p>
            <Link
              href={redirect}
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
              CONTINUE TO CHECKOUT &rarr;
            </Link>
          </div>
        )}

        {/* State: Error / Expired */}
        {status === 'error' && (
          <div>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#fef2f2',
              border: '2px solid #fecaca',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              margin: '0 auto 16px'
            }}>
              ✕
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px', color: '#111' }}>Verification Link Expired</h2>
            <p style={{ color: '#666', fontSize: 13.5, margin: '0 0 20px', lineHeight: 1.5 }}>
              {errorMessage || 'This verification link is invalid or has expired. You can request a new verification link below.'}
            </p>

            {resendSuccess ? (
              <div style={{
                background: '#f0fdf4',
                color: '#16a34a',
                border: '1px solid #bbf7d0',
                padding: '12px 16px',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 20
              }}>
                ✓ {resendSuccess}
              </div>
            ) : (
              <form onSubmit={handleResend} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <input
                  type="email"
                  required
                  placeholder="Enter your registered email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
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
                <button
                  type="submit"
                  disabled={resendLoading || !resendEmail}
                  style={{
                    height: 42,
                    background: resendLoading ? '#888' : '#000',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: resendLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {resendLoading ? 'SENDING LINK...' : 'RESEND VERIFICATION LINK'}
                </button>
              </form>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 13, color: '#666' }}>
              <Link href="/signup" style={{ color: '#000', fontWeight: 600, textDecoration: 'none' }}>
                Sign Up
              </Link>
              <span>•</span>
              <Link href="/login" style={{ color: '#000', fontWeight: 600, textDecoration: 'none' }}>
                Sign In
              </Link>
              <span>•</span>
              <Link href="/shop" style={{ color: '#000', fontWeight: 600, textDecoration: 'none' }}>
                Back to Store
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        Loading...
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
