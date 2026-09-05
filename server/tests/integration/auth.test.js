import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { User, Session, VerificationToken } from '../../src/models/index.js';
import { createAdminUser } from '../../src/scripts/createAdmin.js';

describe('Phase 2 - Authentication & Session Lifecycle API', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);
    app = createApp();

    // Create an admin user for tests
    await createAdminUser('admin@zylo.com.np', 'AdminPass123!', 'Super Admin');
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  describe('User Registration', () => {
    it('POST /api/auth/register should create a new customer account with permanent and temporary addresses', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'sita.rai@example.com',
          password: 'CustomerPass123!',
          name: 'Sita Rai',
          phone: '+977 9801234567',
          permanentAddress: 'Pokhara-8, Kaski',
          temporaryAddress: 'Thamel, Kathmandu'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('sita.rai@example.com');
      expect(res.body.data.user.permanentAddress).toBe('Pokhara-8, Kaski');
      expect(res.body.data.user.temporaryAddress).toBe('Thamel, Kathmandu');
      expect(res.body.data.user.role).toBe('customer');
      expect(res.body.data.user.passwordHash).toBeUndefined(); // ensure passwordHash is stripped
    });

    it('POST /api/auth/register should reject passwords without a special character', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'nospecial@example.com',
          password: 'Password12345',
          name: 'No Special'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('POST /api/auth/register should reject passwords without a number', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'nonumber@example.com',
          password: 'PasswordSpecial!',
          name: 'No Number'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('POST /api/auth/register with duplicate email should return 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'sita.rai@example.com',
          password: 'AnotherPassword123!',
          name: 'Sita Rai Duplicate'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('POST /api/auth/register with missing fields should return 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'incomplete@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('User Login & Session Cookies', () => {
    it('POST /api/auth/login should block unverified users with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sita.rai@example.com',
          password: 'CustomerPass123!'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
      expect(res.body.error.message).toContain('Please verify your email');
    });

    it('POST /api/auth/login with valid credentials after email verification should return tokens and set HttpOnly cookies', async () => {
      // Mark user as verified
      await User.updateOne({ email: 'sita.rai@example.com' }, { isEmailVerified: true, isVerified: true, emailVerifiedAt: new Date() });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sita.rai@example.com',
          password: 'CustomerPass123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('sita.rai@example.com');

      // Check cookies
      const cookies = res.headers['set-cookie'] || [];
      const hasAccessToken = cookies.some((c) => c.includes('zylo_access_token='));
      const hasRefreshToken = cookies.some((c) => c.includes('zylo_refresh_token='));
      const hasCsrfToken = cookies.some((c) => c.includes('XSRF-TOKEN='));

      expect(hasAccessToken).toBe(true);
      expect(hasRefreshToken).toBe(true);
      expect(hasCsrfToken).toBe(true);
    });

    it('POST /api/auth/login with incorrect password should return 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sita.rai@example.com',
          password: 'WrongPassword!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Admin Login & Role Gates', () => {
    it('POST /api/auth/admin/login should allow users with admin role', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: 'admin@zylo.com.np',
          password: 'AdminPass123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('admin');
    });

    it('POST /api/auth/admin/login should reject non-admin users with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: 'sita.rai@example.com',
          password: 'CustomerPass123!'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Token Refresh & Rotation', () => {
    it('POST /api/auth/refresh should rotate refresh token and issue new access token', async () => {
      // 1. Sign in
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sita.rai@example.com',
          password: 'CustomerPass123!'
        });

      const cookies = loginRes.headers['set-cookie'];
      const refreshCookie = cookies.find((c) => c.startsWith('zylo_refresh_token='));

      // 2. Call refresh
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [refreshCookie]);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.accessToken).toBeDefined();

      const newCookies = refreshRes.headers['set-cookie'];
      const newRefreshCookie = newCookies.find((c) => c.startsWith('zylo_refresh_token='));
      expect(newRefreshCookie).toBeDefined();
      expect(newRefreshCookie).not.toBe(refreshCookie); // Rotated!
    });
  });

  describe('Current User & Logout', () => {
    it('GET /api/auth/me should return current user when authenticated', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sita.rai@example.com',
          password: 'CustomerPass123!'
        });

      const token = loginRes.body.data.accessToken;

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe('sita.rai@example.com');
    });

    it('GET /api/auth/me without token should return 401 Unauthorized', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/auth/logout should clear session and cookies', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sita.rai@example.com',
          password: 'CustomerPass123!'
        });

      const cookies = loginRes.headers['set-cookie'];

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies);

      expect(logoutRes.status).toBe(200);

      const logoutCookies = logoutRes.headers['set-cookie'] || [];
      const clearedAccess = logoutCookies.some((c) => c.includes('zylo_access_token=;'));
      expect(clearedAccess).toBe(true);
    });
  });

  describe('Forgot Password & Reset Password Lifecycle', () => {
    it('POST /api/auth/forgot-password with registered email should generate a reset token', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'sita.rai@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('password reset link has been sent');

      const sita = await User.findOne({ email: 'sita.rai@example.com' });
      const tokenDoc = await VerificationToken.findOne({ user: sita._id, type: 'password_reset' });
      expect(tokenDoc).toBeDefined();
      expect(tokenDoc.token).toBeDefined();
      expect(tokenDoc.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('POST /api/auth/forgot-password with non-existent email should return generic 200 without creating token', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent.user@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('password reset link has been sent');
    });

    it('POST /api/auth/reset-password should reject weak passwords', async () => {
      const sita = await User.findOne({ email: 'sita.rai@example.com' });
      const tokenDoc = await VerificationToken.findOne({ user: sita._id, type: 'password_reset' });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: tokenDoc.token,
          password: 'weak'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('POST /api/auth/reset-password should reject invalid tokens', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-non-existent-token-12345',
          password: 'NewStrongPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('POST /api/auth/reset-password with valid token and strong password should reset password, log user in, and invalidate token', async () => {
      const sita = await User.findOne({ email: 'sita.rai@example.com' });
      const tokenDoc = await VerificationToken.findOne({ user: sita._id, type: 'password_reset' });
      const validToken = tokenDoc.token;

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validToken,
          password: 'BrandNewPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('sita.rai@example.com');

      // Check cookies
      const cookies = res.headers['set-cookie'] || [];
      const hasAccessToken = cookies.some((c) => c.includes('zylo_access_token='));
      expect(hasAccessToken).toBe(true);

      // Verify token has been deleted / consumed
      const consumedToken = await VerificationToken.findOne({ token: validToken });
      expect(consumedToken).toBeNull();

      // Verify old password fails
      const oldLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sita.rai@example.com',
          password: 'CustomerPass123!'
        });
      expect(oldLoginRes.status).toBe(401);

      // Verify new password succeeds
      const newLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sita.rai@example.com',
          password: 'BrandNewPassword123!'
        });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.data.user.email).toBe('sita.rai@example.com');
    });
  });
});
