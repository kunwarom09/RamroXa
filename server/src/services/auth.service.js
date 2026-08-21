import bcrypt from 'bcryptjs';
import { User, Session } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_EXPIRY_DAYS
} from '../utils/token.js';

export async function register(data) {
  const { email, password, name, phone, permanentAddress, temporaryAddress } = data;

  if (!email || !password || !name) {
    throw ApiError.badRequest('Email, password, and name are required.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw ApiError.badRequest('A valid email address is required.');
  }

  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
  if (typeof password !== 'string' || !passwordRegex.test(password)) {
    throw ApiError.badRequest('Password must be at least 8 characters long and contain at least 1 alphabet, 1 number, and 1 special character.');
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.');
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    name: name.trim(),
    phone: (phone || '').trim(),
    permanentAddress: (permanentAddress || '').trim(),
    temporaryAddress: (temporaryAddress || '').trim(),
    role: 'customer',
    isEmailVerified: false,
    isActive: true
  });

  return user;
}

export async function login({ email, password, userAgent = '', ip = '', requireAdminRole = false }) {
  if (!email || !password) {
    throw ApiError.badRequest('Email and password are required.');
  }

  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated.');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  if (requireAdminRole && user.role !== 'admin' && user.role !== 'staff') {
    throw ApiError.forbidden('Administrative privileges required.');
  }

  // Create session
  const rawRefreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const session = await Session.create({
    user: user._id,
    refreshTokenHash,
    userAgent,
    ip,
    expiresAt
  });

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = generateAccessToken(user, session._id);

  return {
    user,
    accessToken,
    refreshToken: rawRefreshToken,
    sessionId: session._id
  };
}

export async function refreshTokens({ rawRefreshToken, userAgent = '', ip = '' }) {
  if (!rawRefreshToken) {
    throw ApiError.unauthorized('Refresh token is required.');
  }

  const tokenHash = hashToken(rawRefreshToken);

  // Look for the session matching this hash
  const session = await Session.findOne({ refreshTokenHash: tokenHash }).populate('user');

  if (!session) {
    throw ApiError.unauthorized('Invalid refresh session.');
  }

  // If token is already revoked, potential token theft -> revoke all sessions for this user!
  if (session.revokedAt) {
    await Session.updateMany({ user: session.user._id }, { revokedAt: new Date() });
    throw ApiError.unauthorized('Session compromise detected. Please sign in again.');
  }

  if (session.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh session has expired. Please sign in again.');
  }

  const user = session.user;
  if (!user || !user.isActive || user.deletedAt) {
    throw ApiError.unauthorized('User account is no longer active.');
  }

  // Rotate refresh token (issue new refresh token and invalidate old one)
  const newRawRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRawRefreshToken);

  session.refreshTokenHash = newRefreshTokenHash;
  session.userAgent = userAgent || session.userAgent;
  session.ip = ip || session.ip;
  session.expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  await session.save();

  const accessToken = generateAccessToken(user, session._id);

  return {
    user,
    accessToken,
    refreshToken: newRawRefreshToken
  };
}

export async function logout({ sessionId, rawRefreshToken }) {
  if (sessionId) {
    await Session.findByIdAndUpdate(sessionId, { revokedAt: new Date() });
  } else if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    await Session.findOneAndUpdate({ refreshTokenHash: tokenHash }, { revokedAt: new Date() });
  }
  return true;
}

export default { register, login, refreshTokens, logout };
