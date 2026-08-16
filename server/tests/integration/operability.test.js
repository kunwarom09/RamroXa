import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';

describe('Phase 8 - Production Hardening, OpenAPI Documentation & Observability API', () => {
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

  // ==========================================
  // 1. Health, Readiness, and Liveness Probes
  // ==========================================
  describe('Health Probes & Readiness Checks', () => {
    it('GET /health should return 200 OK with uptime', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('zylo-api');
      expect(res.body.uptime).toBeDefined();
    });

    it('GET /health/live should return 200 alive', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('alive');
    });

    it('GET /health/ready should return 200 ready when DB is connected', async () => {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.checks.database).toBe('up');
    });
  });

  // ==========================================
  // 2. Metrics & Observability
  // ==========================================
  describe('Metrics & Runtime Observability', () => {
    it('GET /health/metrics should output runtime memory, requests, and latency metrics', async () => {
      // Send sample requests to populate metrics
      await request(app).get('/api');
      await request(app).get('/api/categories');

      const res = await request(app).get('/health/metrics');
      expect(res.status).toBe(200);
      const { process, http, uptime } = res.body.data;

      expect(uptime).toBeGreaterThanOrEqual(0);
      expect(process.memory.heapUsedMb).toBeGreaterThan(0);
      expect(http.requestsTotal).toBeGreaterThanOrEqual(2);
      expect(http.statusCodes['2xx']).toBeGreaterThanOrEqual(2);
      expect(http.latenciesMs).toBeDefined();
    });

    it('Incoming requests should receive an x-request-id correlation header', async () => {
      const res = await request(app).get('/api');
      expect(res.headers['x-request-id']).toBeDefined();
    });
  });

  // ==========================================
  // 3. OpenAPI 3.0 Documentation & Swagger UI
  // ==========================================
  describe('Interactive API Documentation', () => {
    it('GET /api/docs/spec.json should return valid OpenAPI 3.0.3 specification', async () => {
      const res = await request(app).get('/api/docs/spec.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.info.title).toBe('Zylo E-Commerce API');
      expect(res.body.paths['/api/auth/login']).toBeDefined();
      expect(res.body.paths['/api/orders']).toBeDefined();
      expect(res.body.paths['/api/admin/finance/journal']).toBeDefined();
    });

    it('GET /api/docs should serve Swagger UI HTML page', async () => {
      const res = await request(app).get('/api/docs/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Zylo API Documentation');
      expect(res.text).toContain('swagger-ui');
      expect(res.text).toContain('swagger-ui-bundle.js');
    });
  });
});
