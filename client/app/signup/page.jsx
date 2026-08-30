'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    retypePassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
      setError('Please fill in all required fields (Name, Email, Address).');
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
      // 1. Register account
      await api.post('/api/auth/register', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        permanentAddress: formData.address.trim(),
        temporaryAddress: formData.address.trim(),
        password: formData.password
      });

      // 2. Auto-login on success
      const loginRes = await api.post('/api/auth/login', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      if (loginRes?.data?.user) {
        localStorage.setItem('zylo_user', JSON.stringify(loginRes.data.user));
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/shop');
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
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
      <style>{`
        .customer-pwd-input::placeholder {
          opacity: 0.5 !important;
          color: rgba(0, 0, 0, 0.5) !important;
        }
      `}</style>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
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
            lineHeight: 1.5
          }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
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
              margin: '0 auto 16px'
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Account Created!</h2>
            <p style={{ color: '#666', fontSize: 14, margin: 0 }}>Signing you in and redirecting to the storefront...</p>
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

            {/* Address */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                ADDRESS <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Thamel, Kathmandu"
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
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT & SIGN IN'}
            </button>
          </form>
        )}

        {/* Footer Link */}
        <div style={{ marginTop: 24, textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 18, fontSize: 13, color: '#666' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#000', fontWeight: 600, textDecoration: 'none' }}>
            Sign In &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
