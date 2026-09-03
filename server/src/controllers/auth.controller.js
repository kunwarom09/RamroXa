import { asyncHandler } from '../utils/asyncHandler.js';
import authService from '../services/auth.service.js';
import {
  getCookieOptions,
  getCsrfCookieOptions,
  generateCsrfToken
} from '../utils/token.js';

export const register = asyncHandler(async (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  const result = await authService.register({ ...req.body, userAgent, ip });

  res.status(201).json({
    message: 'Account created! Please check your email and click the verification link to activate your account.',
    data: {
      user: result.user,
      emailVerificationSent: true,
      verificationToken: result.verificationToken,
      verificationUrl: result.verificationUrl
    }
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.query?.token || req.body?.token;
  const redirect = req.query?.redirect || req.body?.redirect;
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress || '';

  const { user, accessToken, refreshToken, redirect: finalRedirect } = await authService.verifyEmail({
    token,
    redirect,
    userAgent,
    ip
  });

  const csrfToken = generateCsrfToken();

  res.cookie('zylo_access_token', accessToken, getCookieOptions(false));
  res.cookie('zylo_refresh_token', refreshToken, getCookieOptions(true));
  res.cookie('XSRF-TOKEN', csrfToken, getCsrfCookieOptions());

  res.status(200).json({
    message: 'Email verified successfully. Welcome to Ramroxa!',
    data: {
      user,
      accessToken,
      csrfToken,
      redirect: finalRedirect || redirect || '/shop'
    }
  });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const { email, redirect } = req.body;
  const result = await authService.resendVerificationEmail({ email, redirect });
  res.status(200).json({
    message: result.message
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress || '';

  const { user, accessToken, refreshToken } = await authService.login({
    email,
    password,
    userAgent,
    ip,
    requireAdminRole: false
  });

  const csrfToken = generateCsrfToken();

  res.cookie('zylo_access_token', accessToken, getCookieOptions(false));
  res.cookie('zylo_refresh_token', refreshToken, getCookieOptions(true));
  res.cookie('XSRF-TOKEN', csrfToken, getCsrfCookieOptions());

  res.status(200).json({
    message: 'Signed in successfully.',
    data: {
      user,
      accessToken,
      csrfToken
    }
  });
});

export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress || '';

  const { user, accessToken, refreshToken } = await authService.login({
    email,
    password,
    userAgent,
    ip,
    requireAdminRole: true
  });

  const csrfToken = generateCsrfToken();

  res.cookie('zylo_access_token', accessToken, getCookieOptions(false));
  res.cookie('zylo_refresh_token', refreshToken, getCookieOptions(true));
  res.cookie('XSRF-TOKEN', csrfToken, getCsrfCookieOptions());

  res.status(200).json({
    message: 'Admin signed in successfully.',
    data: {
      user,
      accessToken,
      csrfToken
    }
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.zylo_refresh_token || req.body?.refreshToken;
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || '';

  const { user, accessToken, refreshToken } = await authService.refreshTokens({
    rawRefreshToken,
    userAgent,
    ip
  });

  const csrfToken = generateCsrfToken();

  res.cookie('zylo_access_token', accessToken, getCookieOptions(false));
  res.cookie('zylo_refresh_token', refreshToken, getCookieOptions(true));
  res.cookie('XSRF-TOKEN', csrfToken, getCsrfCookieOptions());

  res.status(200).json({
    data: {
      user,
      accessToken,
      csrfToken
    }
  });
});

export const logout = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.zylo_refresh_token;
  const sessionId = req.sessionId;

  await authService.logout({ sessionId, rawRefreshToken });

  const { maxAge: _, ...accessCookieOpts } = getCookieOptions(false);
  const { maxAge: __, ...refreshCookieOpts } = getCookieOptions(true);
  const { maxAge: ___, ...csrfCookieOpts } = getCsrfCookieOptions();

  res.clearCookie('zylo_access_token', accessCookieOpts);
  res.clearCookie('zylo_refresh_token', refreshCookieOpts);
  res.clearCookie('XSRF-TOKEN', csrfCookieOpts);

  res.status(200).json({
    message: 'Signed out successfully.'
  });
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    data: {
      user: req.user
    }
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);
  res.status(200).json({
    message: 'Profile updated successfully.',
    data: { user }
  });
});

export default { register, login, adminLogin, refresh, logout, me, updateMe, verifyEmail, resendVerification };

