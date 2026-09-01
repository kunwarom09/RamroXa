import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (env.NODE_ENV === 'test') {
    // In test environment, use a mock transport to avoid network calls
    transporter = nodemailer.createTransport({
      jsonTransport: true
    });
  } else if (env.SMTP_SERVICE && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      service: env.SMTP_SERVICE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
    console.log(`📧 Configured email transporter using service: ${env.SMTP_SERVICE}`);
  } else if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
    console.log(`📧 Configured email transporter using host: ${env.SMTP_HOST}:${env.SMTP_PORT}`);
  } else {
    // In dev mode without configured SMTP, try ethereal email or stream
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
      console.log('📧 Ethereal test email account initialized for development:', testAccount.user);
    } catch (err) {
      console.warn('⚠️ Could not initialize Ethereal test account, falling back to console logger:', err.message);
      transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
    }
  }

  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  try {
    const transport = await getTransporter();
    const mailOptions = {
      from: env.SMTP_FROM || '"Ramroxa" <noreply@ramroxa.com>',
      to,
      subject,
      text,
      html
    };

    const info = await transport.sendMail(mailOptions);

    if (nodemailer.getTestMessageUrl && info) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`✉️ Email preview URL (Ethereal test mailbox): ${previewUrl}`);
      }
    }

    return info;
  } catch (error) {
    console.error('❌ Failed to send email via nodemailer:', error);
    // Don't crash request if email sending fails in dev, but log error
    if (env.NODE_ENV === 'production') {
      throw error;
    }
    return null;
  }
}

export async function sendVerificationEmail({ user, token, redirect = '/checkout' }) {
  const baseUrl = env.FRONTEND_URL || 'http://localhost:3000';
  const encodedRedirect = encodeURIComponent(redirect || '/checkout');
  const verificationUrl = `${baseUrl}/verify-email?token=${token}&redirect=${encodedRedirect}`;

  console.log('\n======================================================');
  console.log('📧 EMAIL VERIFICATION LINK (For Testing / Dev):');
  console.log(`Recipient: ${user.email}`);
  console.log(`Verification URL: ${verificationUrl}`);
  console.log('======================================================\n');

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
  `;

  const text = `
Hi ${userName},

Thank you for signing up with Ramroxa!

Please verify your email address to complete your account registration:
${verificationUrl}

This link will expire in 24 hours.

Regards,
Ramroxa Team
  `.trim();

  return sendEmail({
    to: user.email,
    subject: 'Verify Your Email to Complete Checkout — Ramroxa',
    html,
    text
  });
}

export default {
  sendEmail,
  sendVerificationEmail
};
