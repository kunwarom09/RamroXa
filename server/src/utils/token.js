import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import env from '../config/env.js';

export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export function generateAccessToken(user, sessionId) {
  const payload = {
    sub: user.id || user._id.toString(),
    role: user.role,
    email: user.email,
    sessionId: sessionId ? sessionId.toString() : undefined
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'zylo-api'
  });
}

export function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'zylo-api' });
  } catch (err) {
    return null;
  }
}

export function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function getCookieOptions(isRefresh = false) {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
    path: isRefresh ? '/api/auth' : '/',
    maxAge: isRefresh
      ? REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      : 15 * 60 * 1000
  };
}

export function getCsrfCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: false, // Must be readable by client JS to send in X-CSRF-Token header
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
    path: '/',
    maxAge: 24 * 60 * 60 * 1000
  };
}

export default {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyAccessToken,
  generateCsrfToken,
  getCookieOptions,
  getCsrfCookieOptions
};
