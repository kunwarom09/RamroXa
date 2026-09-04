import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { User, VerificationToken } from '../../src/models/index.js';
import emailService from '../../src/services/email.service.js';
import { getEmailConfig, maskEmail } from '../../src/config/email.config.js';
import env from '../../src/config/env.js';

describe('Email Verification System & Production Synchronization', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);
    app = createApp();
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    emailService.resetTransporter();
  });

  // -------------------------------------------------------------
  // Test 1: Registration generates a verification token
  // -------------------------------------------------------------
  it('Test 1: Registration generates a secure verification token in the database', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test1.token@example.com',
        password: 'Password123!',
        name: 'Token Verification Test',
        permanentAddress: 'Kathmandu'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('test1.token@example.com');
    expect(res.body.data.user.isEmailVerified).toBe(false);

    // Verify token document exists in database
    const tokenDoc = await VerificationToken.findOne({
      user: res.body.data.user.id || res.body.data.user._id
    });
    expect(tokenDoc).toBeDefined();
    expect(tokenDoc.token).toHaveLength(64); // 32 random bytes hex
    expect(tokenDoc.type).toBe('email_verification');
    expect(tokenDoc.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  // -------------------------------------------------------------
  // Test 2: Verification email service is called
  // -------------------------------------------------------------
  it('Test 2: Verification email service is invoked with recipient, token, and redirect', async () => {
    const sendEmailSpy = vi.spyOn(emailService, 'sendVerificationEmail');

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test2.invoked@example.com',
        password: 'Password123!',
        name: 'Service Invocation Test',
        permanentAddress: 'Pokhara',
        redirect: '/custom-checkout'
      });

    expect(res.status).toBe(201);
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);

    const callArgs = sendEmailSpy.mock.calls[0][0];
    expect(callArgs.user.email).toBe('test2.invoked@example.com');
    expect(callArgs.token).toBeDefined();
    expect(callArgs.redirect).toBe('/custom-checkout');
  });

  // -------------------------------------------------------------
  // Test 3: Missing email configuration produces a clear error in production
  // -------------------------------------------------------------
  it('Test 3: Missing email configuration produces clear error and prevents silent success in production', async () => {
    const originalEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';

    // Mock getEmailConfig to simulate missing/unconfigured credentials in production
    const { getEmailConfig: actualGetConfig } = await import('../../src/config/email.config.js');
    const mockEmailConfig = vi.spyOn(await import('../../src/config/email.config.js'), 'getEmailConfig').mockReturnValue({
      mode: 'UNCONFIGURED',
      service: null,
      host: null,
      port: 587,
      secure: false,
      user: '',
      pass: '',
      from: '"Ramroxa" <noreply@ramroxa.com>',
      frontendUrl: 'https://ramroxa.com',
      hasValidCredentials: false
    });

    try {
      await expect(
        emailService.sendEmail({
          to: 'customer@example.com',
          subject: 'Test Verification',
          html: '<p>Test</p>',
          text: 'Test'
        })
      ).rejects.toThrow('Email service cannot send in production without valid SMTP_USER and SMTP_PASS.');
    } finally {
      mockEmailConfig.mockRestore();
      env.NODE_ENV = originalEnv;
    }
  });

  // -------------------------------------------------------------
  // Test 4: Email provider failure is handled correctly
  // -------------------------------------------------------------
  it('Test 4: Email provider rejection/failure is handled correctly and categorized without swallowing', async () => {
    // Mock the transporter sendMail to throw an authentication error (535 Bad Credentials)
    const mockTransporter = {
      sendMail: vi.fn().mockRejectedValue(new Error('535 5.7.8 Username and Password not accepted')),
      verify: vi.fn().mockRejectedValue(new Error('535 5.7.8 BadCredentials'))
    };

    vi.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

    const result = await emailService.sendEmail({
      to: 'unreachable@example.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
      text: 'Test'
    });

    // In non-production, returns structured error with AUTH_FAILED classification
    expect(result.success).toBe(false);
    expect(result.code).toBe('AUTH_FAILED');
    expect(result.error).toContain('SMTP authentication failed');
  });

  // -------------------------------------------------------------
  // Test 5: Verification URL is generated correctly
  // -------------------------------------------------------------
  it('Test 5: Verification URL is generated correctly with base URL, token, and encoded redirect', async () => {
    const testUser = { email: 'urltest@example.com', name: 'URL Tester' };
    const rawToken = 'abcdef1234567890abcdef1234567890';
    const redirect = '/shop?category=sneakers&sort=price_desc';

    const result = await emailService.sendVerificationEmail({
      user: testUser,
      token: rawToken,
      redirect
    });

    expect(result.verificationUrl).toBeDefined();
    expect(result.verificationUrl).toContain('/verify-email?token=abcdef1234567890abcdef1234567890');
    expect(result.verificationUrl).toContain(`redirect=${encodeURIComponent(redirect)}`);
    expect(result.verificationUrl.startsWith('http://') || result.verificationUrl.startsWith('https://')).toBe(true);
  });

  // -------------------------------------------------------------
  // Test 6: A successful email provider response is handled correctly
  // -------------------------------------------------------------
  it('Test 6: A successful email provider response is handled correctly and reports success', async () => {
    const mockTransporter = {
      sendMail: vi.fn().mockResolvedValue({
        messageId: '<test-message-12345@ramroxa.local>',
        response: '250 2.0.0 OK message queued'
      })
    };

    vi.spyOn(emailService, 'getTransporter').mockResolvedValue(mockTransporter);

    const result = await emailService.sendEmail({
      to: 'happy.customer@example.com',
      subject: 'Welcome to Ramroxa',
      html: '<p>Welcome</p>',
      text: 'Welcome'
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('<test-message-12345@ramroxa.local>');
    expect(result.info.response).toBe('250 2.0.0 OK message queued');
  });

  // -------------------------------------------------------------
  // Test 7: Email verification token lifecycle (verify and login session)
  // -------------------------------------------------------------
  it('POST /api/auth/verify-email with valid token should verify user and issue session cookies', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'lifecycle@example.com',
        password: 'Password123!',
        name: 'Lifecycle Tester',
        permanentAddress: 'Kathmandu'
      });

    expect(registerRes.status).toBe(201);
    const user = await User.findOne({ email: 'lifecycle@example.com' });
    expect(user.isEmailVerified).toBe(false);

    const tokenDoc = await VerificationToken.findOne({ user: user._id });
    expect(tokenDoc).toBeDefined();

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: tokenDoc.token });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.isEmailVerified).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();

    // Verify session cookies set
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.includes('zylo_access_token='))).toBe(true);
    expect(cookies.some((c) => c.includes('zylo_refresh_token='))).toBe(true);

    // User in DB is verified
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.isEmailVerified).toBe(true);

    // Token consumed
    const deletedToken = await VerificationToken.findOne({ user: user._id });
    expect(deletedToken).toBeNull();
  });

  // -------------------------------------------------------------
  // Test 8: Diagnostic API endpoint returns safe status without exposing secrets
  // -------------------------------------------------------------
  it('GET /api/auth/email-diagnostic should return diagnostic status and never expose credentials', async () => {
    const res = await request(app).get('/api/auth/email-diagnostic');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.mode).toBeDefined();
    expect(res.body.data.sender).toBeDefined();
    expect(res.body.data.user).toBeDefined();

    // Ensure password is not present anywhere in response
    const resString = JSON.stringify(res.body);
    expect(resString).not.toContain('your_app_password');
    expect(resString).not.toContain('AdminPassword123!');
  });
});
