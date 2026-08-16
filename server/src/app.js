import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import { requestLogger, httpLogger } from './middleware/requestLogger.js';
import { metricsCollector } from './middleware/metrics.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';
import healthRoutes from './routes/health.routes.js';
import apiRouter from './routes/index.js';

export function createApp() {
  const app = express();

  // Trust proxy for rate limiting / secure cookies behind reverse proxy
  app.set('trust proxy', 1);

  // Security Headers (configured to allow Swagger UI)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );

  // CORS Configuration
  const allowedOrigins = [
    env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001'
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Idempotency-Key', 'X-Guest-Token', 'XSRF-TOKEN']
    })
  );

  // Parsers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // Request tracing & logging
  app.use(requestLogger);
  app.use(httpLogger);

  // Rate Limiting
  app.use(globalLimiter);

  // Observability & Metrics
  app.use(metricsCollector);

  // Auth context middleware
  app.use(authenticate);

  // Health and Readiness checks (unprefixed)
  app.use(healthRoutes);

  // Mount API router
  app.use('/api', apiRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Centralized Error handler
  app.use(errorHandler);

  return app;
}

export default createApp;
