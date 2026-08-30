import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { User, VerificationToken } from '../../src/models/index.js';

describe('Email Verification & Guest Signup Flow', () => {
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

  it('POST /api/auth/register should create an unverified user and a verification token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'checkout.guest@example.com',
        password: 'Password123!',
        name: 'Checkout Guest',
        phone: '+977 9801122334',
        permanentAddress: 'Baluwatar, Kathmandu',
        redirect: '/checkout'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('checkout.guest@example.com');
    expect(res.body.data.user.isEmailVerified).toBe(false);

    // Check that VerificationToken exists in database
    const tokenDoc = await VerificationToken.findOne({
      user: res.body.data.user.id || res.body.data.user._id
    });
    expect(tokenDoc).toBeDefined();
    expect(tokenDoc.token).toBeDefined();
    expect(tokenDoc.type).toBe('email_verification');
  });

  it('POST /api/auth/verify-email with invalid token should return 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'non-existent-or-invalid-token' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('POST /api/auth/verify-email with valid token should verify user and issue session cookies', async () => {
    const user = await User.findOne({ email: 'checkout.guest@example.com' });
    expect(user).toBeDefined();
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

    // Verify cookies are set
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.includes('zylo_access_token='))).toBe(true);
    expect(cookies.some((c) => c.includes('zylo_refresh_token='))).toBe(true);

    // Check user in DB is marked verified
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.isEmailVerified).toBe(true);

    // Check token was consumed and deleted
    const deletedToken = await VerificationToken.findOne({ user: user._id });
    expect(deletedToken).toBeNull();
  });

  it('POST /api/auth/resend-verification should send a new token if user is unverified', async () => {
    // Create another unverified user
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'resend.test@example.com',
        password: 'Password123!',
        name: 'Resend Test',
        permanentAddress: 'Kathmandu'
      });

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({
        email: 'resend.test@example.com',
        redirect: '/checkout'
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('verification link');

    const user = await User.findOne({ email: 'resend.test@example.com' });
    const tokenDoc = await VerificationToken.findOne({ user: user._id });
    expect(tokenDoc).toBeDefined();
  });
});
