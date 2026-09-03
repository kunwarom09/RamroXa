'use client';
import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../services/apiClient';

function EyeIcon({ show }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
      {show ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/checkout';
  const isFromCheckout = redirect.includes('checkout');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    address2: '',
    password: '',
    retypePassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [devVerificationUrl, setDevVerificationUrl] = useState('');

  // Live password validation rules
  const hasMinLen = formData.password.length >= 8;
  const hasAlphabet = /[a-zA-Z]/.test(formData.password);
  const hasNumber = /\d/.test(formData.password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(formData.password);
  const passwordsMatch = formData.password.length > 0 && formData.password === formData.retypePassword;
  const isPasswordValid = hasMinLen && hasAlphabet && hasNumber && hasSpecial;

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.address.trim()) {
      setError('Please fill in all required fields (Name, Email, Address 1).');
      return;
    }

    if (!isPasswordValid) {
      setError('Password must meet all complexity requirements (min 8 chars, 1 letter, 1 number, 1 special character).');
      return;
    }

    if (formData.password !== formData.retypePassword) {
      setError('Passwords do not match. Please retype your password correctly.');
      return;
    }

    setLoading(true);

    try {
      const targetEmail = formData.email.trim().toLowerCase();
      const res = await api.post('/api/auth/register', {
        name: formData.name.trim(),
        email: targetEmail,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        permanentAddress: formData.address.trim(),
        temporaryAddress: formData.address2.trim() || formData.address.trim(),
        password: formData.password,
        redirect
      });

      setRegisteredEmail(targetEmail);
      setVerificationSent(true);

      const vUrl = res?.data?.verificationUrl || (res?.data?.verificationToken ? `/verify-email?token=${res.data.verificationToken}&redirect=${encodeURIComponent(redirect)}` : '');
      if (vUrl) {
        setDevVerificationUrl(vUrl);
      }
    } catch (err) {
      const errMsg =
        err.message ||
        err.details ||
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to create account. Please check your information and try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setResendLoading(true);
    setResendMessage('');
    try {
      const res = await api.post('/api/auth/resend-verification', {
        email: registeredEmail,
        redirect
      });
      setResendMessage(res.message || 'A fresh verification link has been sent to your email.');
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
      <style>{`
        .customer-pwd-input::placeholder {
          opacity: 0.5 !important;
          color: rgba(0, 0, 0, 0.5) !important;
        }
      `}</style>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Link href="/shop" style={{ textDecoration: 'none', color: '#000' }}>
          <span style={{ fontSize: 28, letterSpacing: 6, fontWeight: 700 }}>RAMROXA</span>
        </Link>
        <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>Create your customer account</p>
      </div>

      <div style={{
        background: '#fff',
        border: '1px solid #e5e5e5',
        borderRadius: 16,
        padding: '36px 32px',
        width: '100%',
        maxWidth: 540,
        boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
      }}>
        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            padding: '12px 16px',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 20,
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8
          }}>
            <span>{error}</span>
            {error.toLowerCase().includes('already exists') && (
              <Link
                href={`/login?redirect=${encodeURIComponent(redirect)}`}
                style={{
                  color: '#b91c1c',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  fontSize: 13
                }}
              >
                Sign in now &rarr;
              </Link>
            )}
          </div>
        )}

        {verificationSent ? (
          /* Email Verification Sent View */
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#000',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              margin: '0 auto 20px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
            }}>
              ✉️
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 10px', color: '#111' }}>
              Verify Your Email
            </h2>
            <p style={{ color: '#555', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
              We have sent a verification link to:
              <br />
              <strong style={{ color: '#000', fontSize: 15 }}>{registeredEmail}</strong>
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '16px 20px',
              textAlign: 'left',
              marginBottom: 24,
              fontSize: 13,
              color: '#475569',
              lineHeight: 1.6
            }}>
              <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>Next steps:</div>
              1. Open your email inbox and click the verification button.
              <br />
              2. You will be automatically authenticated and returned to your <strong>checkout page</strong> with your cart intact.
              <br />
              <span style={{ fontSize: 12, color: '#888' }}>(Be sure to check your Spam / Junk folder if you don't see it within a minute.)</span>
            </div>

            {resendMessage && (
              <div style={{
                background: '#f0fdf4',
                color: '#16a34a',
                border: '1px solid #bbf7d0',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                marginBottom: 16
              }}>
                {resendMessage}
              </div>
            )}

            {devVerificationUrl && (
              <div style={{ marginBottom: 16 }}>
                <a
                  href={devVerificationUrl}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '13px 18px',
                    background: '#000',
                    color: '#fff',
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontWeight: 600,
                    textDecoration: 'none',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  Activate Account &amp; Continue &rarr;
                </a>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                style={{
                  width: '100%',
                  height: 42,
                  background: resendLoading ? '#eaeaea' : '#f3f4f6',
                  color: resendLoading ? '#999' : '#111',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: resendLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {resendLoading ? 'SENDING LINK...' : 'RESEND VERIFICATION EMAIL'}
              </button>

              <Link
                href={`/login?redirect=${encodeURIComponent(redirect)}`}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '10px',
                  color: '#666',
                  fontSize: 13,
                  textDecoration: 'none'
                }}
              >
                Already verified? <strong style={{ color: '#000' }}>Sign In &rarr;</strong>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                FULL NAME <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Aarav Sharma"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
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

            {/* Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                EMAIL ADDRESS <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. aarav@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
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

            {/* Phone (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                PHONE NUMBER <span style={{ color: '#888', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. +977 9801234567"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
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

            {/* Address 1 */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                ADDRESS 1 (PERMANENT / PRIMARY) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ward 4, Baluwatar, Kathmandu"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
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

            {/* Address 2 */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                ADDRESS 2 (TEMPORARY / DELIVERY / LANDMARK) <span style={{ color: '#888', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Apartment 3B, Opposite City Center, Thamel"
                value={formData.address2}
                onChange={(e) => handleChange('address2', e.target.value)}
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
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                PASSWORD <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  className="customer-pwd-input"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 40px 0 14px',
                    borderRadius: 8,
                    border: '1px solid #d4d4d4',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    height: 42,
                    width: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: '#666'
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon show={showPassword} />
                </button>
              </div>

              {/* Password Requirement Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                <span style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: hasMinLen ? '#dcfce7' : '#f3f4f6',
                  color: hasMinLen ? '#15803d' : '#6b7280',
                  fontWeight: hasMinLen ? 600 : 400,
                  transition: 'all 0.15s'
                }}>
                  {hasMinLen ? '✓' : '○'} Min 8 characters
                </span>
                <span style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: hasAlphabet ? '#dcfce7' : '#f3f4f6',
                  color: hasAlphabet ? '#15803d' : '#6b7280',
                  fontWeight: hasAlphabet ? 600 : 400,
                  transition: 'all 0.15s'
                }}>
                  {hasAlphabet ? '✓' : '○'} 1 Letter
                </span>
                <span style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: hasNumber ? '#dcfce7' : '#f3f4f6',
                  color: hasNumber ? '#15803d' : '#6b7280',
                  fontWeight: hasNumber ? 600 : 400,
                  transition: 'all 0.15s'
                }}>
                  {hasNumber ? '✓' : '○'} 1 Number
                </span>
                <span style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: hasSpecial ? '#dcfce7' : '#f3f4f6',
                  color: hasSpecial ? '#15803d' : '#6b7280',
                  fontWeight: hasSpecial ? 600 : 400,
                  transition: 'all 0.15s'
                }}>
                  {hasSpecial ? '✓' : '○'} 1 Special character
                </span>
              </div>
            </div>

            {/* Retype Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                RETYPE PASSWORD <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showRetypePassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  className="customer-pwd-input"
                  value={formData.retypePassword}
                  onChange={(e) => handleChange('retypePassword', e.target.value)}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 40px 0 14px',
                    borderRadius: 8,
                    border: `1px solid ${formData.retypePassword ? (passwordsMatch ? '#22c55e' : '#ef4444') : '#d4d4d4'}`,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowRetypePassword(!showRetypePassword)}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    height: 42,
                    width: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: '#666'
                  }}
                  aria-label={showRetypePassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon show={showRetypePassword} />
                </button>
              </div>
              {formData.retypePassword && (
                <div style={{
                  fontSize: 11,
                  marginTop: 4,
                  color: passwordsMatch ? '#16a34a' : '#dc2626',
                  fontWeight: 500
                }}>
                  {passwordsMatch ? '✓ Passwords match' : '✕ Passwords do not match'}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isPasswordValid || !passwordsMatch}
              style={{
                width: '100%',
                height: 44,
                background: (loading || !isPasswordValid || !passwordsMatch) ? '#888' : '#000',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1.5,
                cursor: (loading || !isPasswordValid || !passwordsMatch) ? 'not-allowed' : 'pointer',
                marginTop: 6,
                transition: 'background 0.15s ease'
              }}
            >
              {loading ? 'CREATING ACCOUNT...' : (isFromCheckout ? 'CREATE ACCOUNT & VERIFY EMAIL' : 'CREATE ACCOUNT')}
            </button>
          </form>
        )}

        {/* Footer Link */}
        <div style={{ marginTop: 24, textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 18, fontSize: 13, color: '#666' }}>
          Already have an account?{' '}
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} style={{ color: '#000', fontWeight: 600, textDecoration: 'none' }}>
            Sign In &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        Loading...
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
