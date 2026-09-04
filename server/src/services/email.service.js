import nodemailer from 'nodemailer';
import env from '../config/env.js';
import { getEmailConfig, maskEmail } from '../config/email.config.js';
import logger from '../config/logger.js';

let transporter = null;
let currentTransporterMode = null;

/**
 * Categorize error for clear diagnostic output
 */
export function categorizeEmailError(err) {
  if (!err) return { code: 'UNKNOWN_ERROR', message: 'Unknown email error' };

  const message = err.message || String(err);
  const code = err.code || '';

  if (
    code === 'EAUTH' ||
    message.includes('535') ||
    message.toLowerCase().includes('badcredentials') ||
    message.toLowerCase().includes('username and password not accepted')
  ) {
    return {
      code: 'AUTH_FAILED',
      message: 'SMTP authentication failed. If using Gmail, ensure 2-Step Verification is enabled and a 16-character App Password is used instead of your account password.'
    };
  }

  if (
    code === 'ESOCKET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    message.toLowerCase().includes('connection timeout')
  ) {
    return {
      code: 'CONNECTION_FAILED',
      message: `Failed to connect to SMTP server: ${message}`
    };
  }

  if (message.includes('550') || message.includes('553') || message.includes('501')) {
    return {
      code: 'INVALID_SENDER',
      message: `Sender address or domain rejected by mail server: ${message}`
    };
  }

  return {
    code: code || 'PROVIDER_ERROR',
    message
  };
}

/**
 * Initialize and cache the appropriate Nodemailer transporter based on active configuration
 */
export async function getTransporter() {
  const config = getEmailConfig();

  if (transporter && currentTransporterMode === config.mode) {
    return transporter;
  }

  currentTransporterMode = config.mode;

  if (config.mode === 'TEST_MOCK') {
    transporter = nodemailer.createTransport({
      jsonTransport: true
    });
    return transporter;
  }

  if (config.mode === 'LIVE_SMTP') {
    if (config.service === 'gmail') {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.user,
          pass: config.pass
        }
      });
      logger.info({ user: maskEmail(config.user) }, 'Configured Gmail SMTP transporter');
    } else {
      transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass
        }
      });
      logger.info({ host: config.host, port: config.port, user: maskEmail(config.user) }, 'Configured custom SMTP transporter');
    }
    return transporter;
  }

  // Development Fallback: Attempt Ethereal test inbox, fallback to stream
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    logger.info({ testAccount: testAccount.user }, 'Initialized Ethereal development test account');
  } catch (err) {
    logger.warn({ err: err.message }, 'Could not initialize Ethereal test account; falling back to stream transport');
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }

  return transporter;
}

/**
 * Reset active transporter (used by tests or environment reloading)
 */
export function resetTransporter() {
  transporter = null;
  currentTransporterMode = null;
}

/**
 * Test SMTP connection and verify credentials
 */
export async function verifyTransporter() {
  const config = getEmailConfig();

  if (config.mode === 'UNCONFIGURED') {
    return {
      success: false,
      code: 'CONFIG_INCOMPLETE',
      message: 'SMTP credentials are not configured or are placeholder values.',
      mode: config.mode
    };
  }

  try {
    const transport = await emailService.getTransporter();
    if (transport.verify) {
      await transport.verify();
    }
    return {
      success: true,
      mode: config.mode,
      provider: config.service || config.host,
      message: 'SMTP connection verified successfully.'
    };
  } catch (err) {
    const categorized = categorizeEmailError(err);
    return {
      success: false,
      mode: config.mode,
      code: categorized.code,
      message: categorized.message
    };
  }
}

/**
 * Send an email with complete error diagnostic reporting
 */
export async function sendEmail({ to, subject, html, text }) {
  const config = getEmailConfig();

  if (config.mode === 'UNCONFIGURED') {
    const errObj = {
      code: 'CONFIG_MISSING',
      message: 'Email service cannot send in production without valid SMTP_USER and SMTP_PASS.'
    };
    logger.error({ to, subject }, errObj.message);
    if (env.NODE_ENV === 'production') {
      throw new Error(errObj.message);
    }
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      mode: config.mode
    };
  }

  try {
    const transport = await emailService.getTransporter();
    const mailOptions = {
      from: config.from,
      to,
      subject,
      text,
      html
    };

    const info = await transport.sendMail(mailOptions);
    let previewUrl = null;

    if (nodemailer.getTestMessageUrl && info) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info({ previewUrl }, 'Ethereal email preview URL generated');
      }
    }

    return {
      success: true,
      messageId: info?.messageId || 'mock-id',
      previewUrl,
      mode: config.mode,
      info
    };
  } catch (error) {
    const categorized = categorizeEmailError(error);
    logger.error(
      {
        to,
        subject,
        code: categorized.code,
        err: categorized.message
      },
      'Failed to deliver email'
    );

    if (env.NODE_ENV === 'production') {
      const prodErr = new Error(categorized.message);
      prodErr.code = categorized.code;
      throw prodErr;
    }

    return {
      success: false,
      error: categorized.message,
      code: categorized.code,
      mode: config.mode
    };
  }
}

/**
 * Send account verification email with security tokens and fallback links
 */
export async function sendVerificationEmail({ user, token, redirect = '/checkout' }) {
  const config = getEmailConfig();
  const baseUrl = config.frontendUrl;
  const encodedRedirect = encodeURIComponent(redirect || '/checkout');
  const verificationUrl = `${baseUrl}/verify-email?token=${token}&redirect=${encodedRedirect}`;

  logger.info(
    {
      recipient: user.email,
      mode: config.mode,
      verificationUrl
    },
    'Initiating verification email dispatch'
  );

  // If in dev fallback, print a very visible terminal box with 1-click verification link
  if (config.mode === 'DEV_FALLBACK') {
    console.log('\n┌────────────────────────────────────────────────────────────────────┐');
    console.log('│  📧 [DEV PREVIEW] EMAIL VERIFICATION LINK GENERATED                 │');
    console.log(`│  Recipient: ${user.email.padEnd(54)} │`);
    console.log(`│  Clickable URL:                                                    │`);
    console.log(`│  ${verificationUrl.padEnd(66)}│`);
    console.log('└────────────────────────────────────────────────────────────────────┘\n');
  }

  const userName = user.name || 'Valued Customer';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Ramroxa</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: #000000;
      padding: 32px 24px;
      text-align: center;
    }
    .brand-title {
      color: #ffffff;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 6px;
      margin: 0;
    }
    .content {
      padding: 36px 32px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .message {
      font-size: 15px;
      color: #475569;
      margin-bottom: 28px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .cta-btn {
      display: inline-block;
      background-color: #000000;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: 1.5px;
      padding: 16px 36px;
      border-radius: 8px;
      text-transform: uppercase;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .fallback-link {
      font-size: 12px;
      color: #94a3b8;
      word-break: break-all;
      margin-top: 24px;
      border-top: 1px solid #f1f5f9;
      padding-top: 16px;
    }
    .fallback-link a {
      color: #2563eb;
    }
    .footer {
      background: #f8fafc;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="brand-title">RAMROXA</h1>
    </div>
    <div class="content">
      <h2 class="greeting">Hi ${userName},</h2>
      <p class="message">
        Thank you for creating an account with Ramroxa. Please verify your email address to secure your account and activate your profile.
      </p>

      <div class="btn-container">
        <a href="${verificationUrl}" class="cta-btn" target="_blank">Verify Email Address</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 28px;">
        This verification link will expire in <strong>24 hours</strong>. If you did not request this, you can safely ignore this email.
      </p>

      <div class="fallback-link">
        <p style="margin: 0 0 6px;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} RAMROXA Nepal. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Hi ${userName},

Thank you for signing up with Ramroxa!

Please verify your email address to complete your account registration:
${verificationUrl}

This link will expire in 24 hours.

Regards,
Ramroxa Team
  `.trim();

  const result = await emailService.sendEmail({
    to: user.email,
    subject: 'Verify Your Email to Complete Checkout — Ramroxa',
    html,
    text
  });

  return {
    ...result,
    verificationUrl
  };
}

const emailService = {
  sendEmail,
  sendVerificationEmail,
  verifyTransporter,
  resetTransporter,
  categorizeEmailError,
  getTransporter
};

export default emailService;
