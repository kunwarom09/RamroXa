import express from 'express';
import { isDbReady, pingDB } from '../config/db.js';
import { getSystemMetrics } from '../middleware/metrics.js';

export const router = express.Router();

// Root API status and friendly developer landing page
router.get('/', (req, res) => {
  if (req.accepts('html')) {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ramroxa E-Commerce API Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
          .card { background: #141414; border: 1px solid #262626; border-radius: 14px; max-width: 580px; width: 100%; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          h1 { margin-top: 0; font-size: 24px; display: flex; align-items: center; gap: 10px; }
          .status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: #064e3b; color: #34d399; border-radius: 999px; font-size: 13px; font-weight: 600; }
          .pulse { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
          p { color: #888; font-size: 14px; line-height: 1.6; }
          .links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
          .btn { background: #222; color: #fff; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; border: 1px solid #333; transition: all 0.2s; }
          .btn:hover { background: #fff; color: #000; }
          .btn.primary { background: #fff; color: #000; font-weight: 600; }
          .endpoints { margin-top: 24px; background: #0c0c0c; border: 1px solid #1f1f1f; border-radius: 8px; padding: 14px; font-family: monospace; font-size: 12px; color: #aaa; }
          .endpoints div { margin-bottom: 6px; }
          .badge { color: #10b981; }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1>Ramroxa API</h1>
            <span class="status"><span class="pulse"></span> Active & Online</span>
          </div>
          <p>The backend REST API service is running normally on port 5000 in development mode.</p>
          <div class="links">
            <a href="http://localhost:3000" class="btn primary">Open Storefront (3000)</a>
            <a href="http://localhost:3000/admin" class="btn">Admin Dashboard</a>
            <a href="/api/docs" class="btn">Swagger Docs</a>
            <a href="/health" class="btn">Health Check</a>
          </div>
          <div class="endpoints">
            <div><span class="badge">GET</span> /health &bull; <span style="color:#666">Liveness Check</span></div>
            <div><span class="badge">GET</span> /ready &bull; <span style="color:#666">MongoDB Dependency Check</span></div>
            <div><span class="badge">GET</span> /api/products &bull; <span style="color:#666">Product Catalog</span></div>
            <div><span class="badge">GET</span> /api/orders &bull; <span style="color:#666">Customer Orders</span></div>
            <div><span class="badge">GET</span> /api/docs &bull; <span style="color:#666">Interactive OpenAPI Spec</span></div>
          </div>
        </div>
      </body>
      </html>
    `);
  }
  res.status(200).json({
    name: 'Ramroxa E-Commerce API',
    version: '1.0.0',
    status: 'active',
    port: 5000,
    health: '/health',
    ready: '/ready',
    documentation: '/api/docs',
    timestamp: new Date().toISOString()
  });
});

// Favicon handler to eliminate 404s
router.get('/favicon.ico', (req, res) => res.status(204).end());

// Liveness probe (cheap in-memory check)
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'zylo-api'
  });
});

router.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness probe (deep dependency check)
router.get(['/ready', '/health/ready'], async (req, res) => {
  const dbReady = isDbReady();
  const dbPing = dbReady ? await pingDB() : false;

  if (!dbReady || !dbPing) {
    return res.status(503).json({
      status: 'unavailable',
      checks: {
        database: 'down'
      },
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    status: 'ready',
    checks: {
      database: 'up'
    },
    timestamp: new Date().toISOString()
  });
});

// Runtime metrics & diagnostic observability
router.get('/health/metrics', (req, res) => {
  const metrics = getSystemMetrics();
  res.status(200).json({ data: metrics });
});

export default router;
