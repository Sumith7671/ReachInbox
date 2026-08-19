import app from './app';
import { config } from './config';
import { startWorker } from './workers/email.worker';
import { logger } from './utils/logger';

const PORT = config.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`🚀 ReachInbox API server listening on http://localhost:${PORT}`);
  logger.info(`⚡ Environment: ${config.NODE_ENV}`);
  
  // Start BullMQ Worker in same process or dedicated process
  startWorker();
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
