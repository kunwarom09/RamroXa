import express from 'express';
import { isDbReady, pingDB } from '../config/db.js';
import { getSystemMetrics } from '../middleware/metrics.js';

export const router = express.Router();

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
