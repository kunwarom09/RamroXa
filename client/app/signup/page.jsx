'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../services/apiClient';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    permanentAddress: '',
    temporaryAddress: '',
    password: '',
    retypePassword: ''
  });

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

    if (!formData.name.trim() || !formData.email.trim() || !formData.permanentAddress.trim() || !formData.temporaryAddress.trim()) {
      setError('Please fill in all required fields (Name, Email, Permanent Address, Temporary Address).');
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
        permanentAddress: formData.permanentAddress.trim(),
        temporaryAddress: formData.temporaryAddress.trim(),
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

            {/* Addresses Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                  PERMANENT ADDRESS <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pokhara-8, Kaski"
                  value={formData.permanentAddress}
                  onChange={(e) => handleChange('permanentAddress', e.target.value)}
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

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                  TEMPORARY ADDRESS <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Thamel, Kathmandu"
                  value={formData.temporaryAddress}
                  onChange={(e) => handleChange('temporaryAddress', e.target.value)}
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
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                PASSWORD <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
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
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={formData.retypePassword}
                onChange={(e) => handleChange('retypePassword', e.target.value)}
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: `1px solid ${formData.retypePassword ? (passwordsMatch ? '#22c55e' : '#ef4444') : '#d4d4d4'}`,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
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
