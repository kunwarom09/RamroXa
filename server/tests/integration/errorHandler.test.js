import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ApiError } from '../../src/utils/ApiError.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { requestLogger } from '../../src/middleware/requestLogger.js';

describe('Centralized Error Handling Middleware', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(requestLogger);

    app.get('/test-bad-request', (req, res, next) => {
      next(ApiError.badRequest('Invalid payload', { field: 'email' }));
    });

    app.get('/test-conflict', (req, res, next) => {
      next(ApiError.conflict('Stock conflict'));
    });

    app.get('/test-unhandled', (req, res, next) => {
      next(new Error('Unexpected system fault'));
    });

    app.use(errorHandler);
  });

  it('should format operational ApiError into consistent JSON structure', async () => {
    const res = await request(app).get('/test-bad-request');
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({
      code: 'BAD_REQUEST',
      message: 'Invalid payload',
      requestId: expect.any(String),
      details: { field: 'email' }
    });
  });

  it('should return 409 for conflict error', async () => {
    const res = await request(app).get('/test-conflict');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toBe('Stock conflict');
  });

  it('should format 500 internal server error safely', async () => {
    const res = await request(app).get('/test-unhandled');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(res.body.error.requestId).toBeDefined();
  });
});
