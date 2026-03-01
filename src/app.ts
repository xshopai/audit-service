/**
 * Audit Service - Consumer Application
 * Subscribes to audit events from other services via Dapr pub/sub or RabbitMQ directly
 *
 * Dual-mode operation:
 * - Production (Dapr): Events received via HTTP endpoints from Dapr subscriptions
 * - Local Dev (RabbitMQ): Events consumed directly from RabbitMQ when Dapr is unavailable
 */

import express from 'express';
import { config, validateConfig } from './config/index.js';
import { initializeDatabase, closeDatabaseConnections } from './db/index.js';
import logger from './core/logger.js';
import { register as consulRegister, deregister as consulDeregister } from './core/consulRegistration.js';
import { traceContextMiddleware } from './middleware/traceContext.middleware.js';
import { errorMiddleware, notFoundHandler } from './middleware/error.middleware.js';
import homeRoutes from './routes/home.routes.js';
import operationalRoutes from './routes/operational.routes.js';
import eventRoutes from './routes/events.routes.js';
import { rabbitmqConsumer } from './consumers/rabbitmq.consumer.js';

// Consumer state tracking
export const consumerState = {
  connected: false,
  consuming: false,
  messagesProcessed: 0,
  lastMessageAt: null as Date | null,
  startedAt: new Date(),
};

export function trackMessageProcessed() {
  consumerState.messagesProcessed++;
  consumerState.lastMessageAt = new Date();
}

/**
 * Initialize and start Express server
 */
function startExpressServer(): void {
  const app = express();
  const PORT = config.port || 8012;
  const HOST = '0.0.0.0';

  // Middleware
  app.use(express.json());
  app.use(traceContextMiddleware as any); // W3C Trace Context

  // Routes
  app.use('/', homeRoutes);
  app.use('/', operationalRoutes);
  app.use('/', eventRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorMiddleware as any);

  app.listen(PORT, HOST, async () => {
    const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
    await consulRegister('audit-service', PORT, HOST);
    logger.info(`Audit Service running on ${displayHost}:${PORT}`);
    logger.info(`Ready to receive events from Dapr subscriptions`);
  });
}

/**
 * Check if Dapr sidecar is available
 */
async function isDaprAvailable(): Promise<boolean> {
  const daprPort = process.env.DAPR_HTTP_PORT || '3500';
  try {
    const response = await fetch(`http://localhost:${daprPort}/v1.0/healthz`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Start the consumer service
 */
export async function startConsumer() {
  try {
    logger.info('Starting Audit Service Consumer...');

    // Validate configuration
    validateConfig();
    logger.info('Configuration validated');

    // Initialize database
    await initializeDatabase();
    consumerState.connected = true;
    logger.info('Database initialized');

    // Check Dapr availability
    const daprAvailable = await isDaprAvailable();
    const messagingProvider = process.env.MESSAGING_PROVIDER || (daprAvailable ? 'dapr' : 'rabbitmq');

    if (messagingProvider === 'dapr') {
      // Start Express server with Dapr event routes
      startExpressServer();
      consumerState.consuming = true;
      logger.info('Audit Service Consumer started successfully with Dapr mode');
    } else {
      // Start Express server (for health checks) and RabbitMQ consumer
      startExpressServer();
      await rabbitmqConsumer.start();
      consumerState.consuming = true;
      logger.info('Audit Service Consumer started successfully with RabbitMQ mode');
    }
  } catch (error) {
    logger.error('Failed to start consumer:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, starting graceful shutdown...`);

  try {
    consumerState.consuming = false;

    // Deregister from Consul
    await consulDeregister();

    // Stop RabbitMQ consumer if running
    await rabbitmqConsumer.stop();

    // Close database connections
    await closeDatabaseConnections();
    consumerState.connected = false;

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

// Error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection', { promise, reason });
  gracefulShutdown('unhandledRejection');
});

// Start the consumer only when this file is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  startConsumer();
}
