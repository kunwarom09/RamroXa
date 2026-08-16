import { createApp } from './app.js';
import env from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import logger from './config/logger.js';

const app = createApp();

let server = null;

async function startServer() {
  try {
    // Attempt DB connection (non-blocking for app creation, but connected before listening)
    try {
      await connectDB();
    } catch (dbErr) {
      logger.warn({ err: dbErr.message }, 'Starting server without initial MongoDB connection (will retry or handle via /ready)');
    }

    server = app.listen(env.PORT, () => {
      logger.info(`🚀 Zylo Backend API server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
      logger.info(`Readiness check: http://localhost:${env.PORT}/ready`);
    });
  } catch (err) {
    logger.fatal({ err: err.message }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful Shutdown
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await disconnectDB();
        logger.info('MongoDB connection closed.');
        process.exit(0);
      } catch (err) {
        logger.error({ err: err.message }, 'Error closing MongoDB connection');
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds if hanging
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error.message, stack: error.stack }, 'Uncaught Exception');
  process.exit(1);
});

startServer();
