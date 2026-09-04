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
    message: result.emailVerificationSent
      ? 'Account created! Please check your email and click the verification link to activate your account.'
      : 'Account created! Verification link generated.',
    data: {
      user: result.user,
      emailVerificationSent: result.emailVerificationSent,
      verificationToken: result.verificationToken,
      verificationUrl: result.verificationUrl,
      deliveryStatus: result.deliveryStatus,
      deliveryMode: result.deliveryMode,
      deliveryError: result.deliveryError
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
    message: result.message,
    data: {
      deliveryStatus: result.deliveryStatus,
      deliveryMode: result.deliveryMode,
      deliveryError: result.deliveryError
    }
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

export const getEmailDiagnostic = asyncHandler(async (req, res) => {
  const { getEmailConfig, maskEmail } = await import('../config/email.config.js');
  const { verifyTransporter } = await import('../services/email.service.js');

  const config = getEmailConfig();
  const verifyResult = await verifyTransporter();

  res.status(200).json({
    data: {
      mode: config.mode,
      provider: config.service || config.host,
      port: config.port,
      secure: config.secure,
      sender: config.from,
      user: maskEmail(config.user),
      isConfigured: config.hasValidCredentials,
      verification: verifyResult
    }
  });
});

export const sendTestEmail = asyncHandler(async (req, res) => {
  const { sendEmail } = await import('../services/email.service.js');
  const targetEmail = req.body?.to || req.user?.email;
  if (!targetEmail) {
    return res.status(400).json({ error: { message: 'Recipient email address (to) is required.' } });
  }

  const result = await sendEmail({
    to: targetEmail,
    subject: `Ramroxa Test Email [${new Date().toISOString()}]`,
    text: 'This is a diagnostic test email from the Ramroxa API server.',
    html: '<p>This is a diagnostic test email from the <strong>Ramroxa API server</strong>.</p>'
  });

  res.status(200).json({
    message: result.success ? 'Test email sent successfully.' : 'Failed to send test email.',
    data: result
  });
});

export default {
  register,
  login,
  adminLogin,
  refresh,
  logout,
  me,
  updateMe,
  verifyEmail,
  resendVerification,
  getEmailDiagnostic,
  sendTestEmail
};

