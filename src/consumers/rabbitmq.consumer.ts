/**
 * RabbitMQ Consumer for Audit Service
 * Direct RabbitMQ subscription for local development without Dapr
 *
 * Subscribes to 40 topics across all domains for audit logging.
 * Mirrors the Dapr subscriptions defined in .dapr/components/subscriptions.yaml
 */

import logger from '../core/logger.js';
import { trackMessageProcessed } from '../app.js';
import {
  // Auth Events
  handleUserRegistered,
  handleLogin,
  handleEmailVerificationRequested,
  handlePasswordResetRequested,
  handlePasswordResetCompleted,
  handleAccountReactivationRequested,
  // User Events
  handleUserCreated,
  handleUserUpdated,
  handleUserDeleted,
  handleEmailVerified,
  handlePasswordChanged,
  // Order Events
  handleOrderCreated,
  handleOrderCancelled,
  handleOrderDelivered,
  handlePaymentReceived,
  handlePaymentFailed,
  // Product Events
  handleProductCreated,
  handleProductUpdated,
  handleProductDeleted,
  handleProductPriceChanged,
  // Cart Events
  handleCartItemAdded,
  handleCartItemRemoved,
  handleCartCleared,
  handleCartAbandoned,
  // Inventory Events
  handleInventoryStockUpdated,
  handleInventoryRestock,
  handleInventoryLowStockAlert,
  handleInventoryReserved,
  // Review Events
  handleReviewCreated,
  handleReviewUpdated,
  handleReviewDeleted,
  handleReviewModerated,
  handleReviewFlagged,
  // Notification Events
  handleNotificationSent,
  handleNotificationDelivered,
  handleNotificationFailed,
  handleNotificationOpened,
  // Admin Events
  handleAdminActionPerformed,
  handleAdminUserCreated,
  handleAdminConfigChanged,
} from '../controllers/events.controller.js';

// Dynamic import for amqplib (optional dependency)
let amqplib: typeof import('amqplib') | null = null;

async function getAmqpLib(): Promise<typeof import('amqplib')> {
  if (!amqplib) {
    try {
      amqplib = await import('amqplib');
    } catch {
      throw new Error('RabbitMQ provider requires amqplib package. Install with: npm install amqplib @types/amqplib');
    }
  }
  return amqplib;
}

/**
 * Topic to handler mapping for all 40 audit topics
 * Maps RabbitMQ topic (routing key) to the appropriate handler function
 */
const TOPIC_HANDLERS: Record<string, (event: any) => Promise<void>> = {
  // Auth Events (6)
  'auth.user.registered': async (event) => {
    await handleUserRegistered(createMockRequest(event), createMockResponse());
  },
  'auth.login': async (event) => {
    await handleLogin(createMockRequest(event), createMockResponse());
  },
  'auth.email.verification.requested': async (event) => {
    await handleEmailVerificationRequested(createMockRequest(event), createMockResponse());
  },
  'auth.password.reset.requested': async (event) => {
    await handlePasswordResetRequested(createMockRequest(event), createMockResponse());
  },
  'auth.password.reset.completed': async (event) => {
    await handlePasswordResetCompleted(createMockRequest(event), createMockResponse());
  },
  'auth.account.reactivation.requested': async (event) => {
    await handleAccountReactivationRequested(createMockRequest(event), createMockResponse());
  },

  // User Events (5)
  'user.created': async (event) => {
    await handleUserCreated(createMockRequest(event), createMockResponse());
  },
  'user.updated': async (event) => {
    await handleUserUpdated(createMockRequest(event), createMockResponse());
  },
  'user.deleted': async (event) => {
    await handleUserDeleted(createMockRequest(event), createMockResponse());
  },
  'email.verified': async (event) => {
    await handleEmailVerified(createMockRequest(event), createMockResponse());
  },
  'password.changed': async (event) => {
    await handlePasswordChanged(createMockRequest(event), createMockResponse());
  },

  // Order Events (3)
  'order.created': async (event) => {
    await handleOrderCreated(createMockRequest(event), createMockResponse());
  },
  'order.cancelled': async (event) => {
    await handleOrderCancelled(createMockRequest(event), createMockResponse());
  },
  'order.delivered': async (event) => {
    await handleOrderDelivered(createMockRequest(event), createMockResponse());
  },

  // Payment Events (2)
  'payment.received': async (event) => {
    await handlePaymentReceived(createMockRequest(event), createMockResponse());
  },
  'payment.failed': async (event) => {
    await handlePaymentFailed(createMockRequest(event), createMockResponse());
  },

  // Product Events (4)
  'product.created': async (event) => {
    await handleProductCreated(createMockRequest(event), createMockResponse());
  },
  'product.updated': async (event) => {
    await handleProductUpdated(createMockRequest(event), createMockResponse());
  },
  'product.deleted': async (event) => {
    await handleProductDeleted(createMockRequest(event), createMockResponse());
  },
  'product.price.changed': async (event) => {
    await handleProductPriceChanged(createMockRequest(event), createMockResponse());
  },

  // Cart Events (4)
  'cart.item.added': async (event) => {
    await handleCartItemAdded(createMockRequest(event), createMockResponse());
  },
  'cart.item.removed': async (event) => {
    await handleCartItemRemoved(createMockRequest(event), createMockResponse());
  },
  'cart.cleared': async (event) => {
    await handleCartCleared(createMockRequest(event), createMockResponse());
  },
  'cart.abandoned': async (event) => {
    await handleCartAbandoned(createMockRequest(event), createMockResponse());
  },

  // Inventory Events (4)
  'inventory.stock.updated': async (event) => {
    await handleInventoryStockUpdated(createMockRequest(event), createMockResponse());
  },
  'inventory.restock': async (event) => {
    await handleInventoryRestock(createMockRequest(event), createMockResponse());
  },
  'inventory.low.stock.alert': async (event) => {
    await handleInventoryLowStockAlert(createMockRequest(event), createMockResponse());
  },
  'inventory.reserved': async (event) => {
    await handleInventoryReserved(createMockRequest(event), createMockResponse());
  },

  // Review Events (5)
  'review.created': async (event) => {
    await handleReviewCreated(createMockRequest(event), createMockResponse());
  },
  'review.updated': async (event) => {
    await handleReviewUpdated(createMockRequest(event), createMockResponse());
  },
  'review.deleted': async (event) => {
    await handleReviewDeleted(createMockRequest(event), createMockResponse());
  },
  'review.moderated': async (event) => {
    await handleReviewModerated(createMockRequest(event), createMockResponse());
  },
  'review.flagged': async (event) => {
    await handleReviewFlagged(createMockRequest(event), createMockResponse());
  },

  // Notification Events (4)
  'notification.sent': async (event) => {
    await handleNotificationSent(createMockRequest(event), createMockResponse());
  },
  'notification.delivered': async (event) => {
    await handleNotificationDelivered(createMockRequest(event), createMockResponse());
  },
  'notification.failed': async (event) => {
    await handleNotificationFailed(createMockRequest(event), createMockResponse());
  },
  'notification.opened': async (event) => {
    await handleNotificationOpened(createMockRequest(event), createMockResponse());
  },

  // Admin Events (3)
  'admin.action.performed': async (event) => {
    await handleAdminActionPerformed(createMockRequest(event), createMockResponse());
  },
  'admin.user.created': async (event) => {
    await handleAdminUserCreated(createMockRequest(event), createMockResponse());
  },
  'admin.config.changed': async (event) => {
    await handleAdminConfigChanged(createMockRequest(event), createMockResponse());
  },
};

/**
 * Create mock Express request object for handler compatibility
 */
function createMockRequest(event: any): any {
  return {
    body: event,
    headers: {
      'content-type': 'application/json',
    },
  };
}

/**
 * Create mock Express response object for handler compatibility
 */
function createMockResponse(): any {
  return {
    status: () => ({
      json: () => {},
    }),
    json: () => {},
  };
}

export class RabbitMQConsumer {
  private connection: import('amqplib').Connection | null = null;
  private channel: import('amqplib').Channel | null = null;
  private readonly url: string;
  private readonly exchange: string;
  private readonly queueName: string;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 5000;

  constructor() {
    this.url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    this.exchange = process.env.RABBITMQ_EXCHANGE || 'xshopai.events';
    this.queueName = 'audit-service-queue';
  }

  /**
   * Start the RabbitMQ consumer and subscribe to all audit topics
   */
  async start(): Promise<void> {
    try {
      await this.connect();
      await this.subscribe();
      logger.info('RabbitMQ consumer started successfully', {
        operation: 'consumer_start',
        provider: 'rabbitmq',
        topics: Object.keys(TOPIC_HANDLERS).length,
        queue: this.queueName,
      });
    } catch (error) {
      logger.error('Failed to start RabbitMQ consumer', {
        operation: 'consumer_start',
        provider: 'rabbitmq',
        error: error instanceof Error ? error.message : String(error),
      });
      await this.handleReconnect();
    }
  }

  /**
   * Connect to RabbitMQ
   */
  private async connect(): Promise<void> {
    const amqp = await getAmqpLib();

    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();

    // Cast to any for missing type definitions
    const channel = this.channel as any;

    // Set prefetch for better load distribution
    await channel.prefetch(10);

    // Ensure exchange exists
    await channel.assertExchange(this.exchange, 'topic', { durable: true });

    // Assert queue
    await channel.assertQueue(this.queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': `${this.exchange}.dlx`,
      },
    });

    // Handle connection events
    this.connection.on('close', () => {
      logger.warn('RabbitMQ connection closed', {
        operation: 'connection_close',
        provider: 'rabbitmq',
      });
      this.handleReconnect();
    });

    this.connection.on('error', (err) => {
      logger.error('RabbitMQ connection error', {
        operation: 'connection_error',
        provider: 'rabbitmq',
        error: err?.message || 'Unknown error',
      });
    });

    logger.info('RabbitMQ connection established', {
      operation: 'connection_established',
      provider: 'rabbitmq',
      exchange: this.exchange,
    });
  }

  /**
   * Subscribe to all audit topics
   */
  private async subscribe(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    // Cast to any for missing type definitions
    const channel = this.channel as any;
    const topics = Object.keys(TOPIC_HANDLERS);

    // Bind queue to all topics
    for (const topic of topics) {
      await channel.bindQueue(this.queueName, this.exchange, topic);
      logger.debug(`Bound queue to topic: ${topic}`, {
        operation: 'bind_topic',
        provider: 'rabbitmq',
        topic,
        queue: this.queueName,
      });
    }

    // Start consuming messages
    await channel.consume(
      this.queueName,
      async (msg: any) => {
        if (!msg) return;

        const routingKey = msg.fields.routingKey;
        const content = msg.content.toString();

        try {
          const event = JSON.parse(content);
          const handler = TOPIC_HANDLERS[routingKey];

          if (handler) {
            await handler(event);
            trackMessageProcessed();
            channel.ack(msg);

            logger.debug(`Processed audit event: ${routingKey}`, {
              operation: 'message_processed',
              provider: 'rabbitmq',
              topic: routingKey,
              eventId: event.id || event.eventId,
            });
          } else {
            logger.warn(`No handler for topic: ${routingKey}`, {
              operation: 'no_handler',
              provider: 'rabbitmq',
              topic: routingKey,
            });
            // Acknowledge unknown topics to prevent requeue
            channel.ack(msg);
          }
        } catch (error) {
          logger.error(`Error processing audit event: ${routingKey}`, {
            operation: 'message_error',
            provider: 'rabbitmq',
            topic: routingKey,
            error: error instanceof Error ? error.message : String(error),
          });
          // Reject and requeue on error
          channel.nack(msg, false, true);
        }
      },
      { noAck: false },
    );

    logger.info(`Subscribed to ${topics.length} audit topics`, {
      operation: 'subscribe_complete',
      provider: 'rabbitmq',
      topicCount: topics.length,
      queue: this.queueName,
    });
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached', {
        operation: 'reconnect_failed',
        provider: 'rabbitmq',
        attempts: this.reconnectAttempts,
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.info(`Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`, {
      operation: 'reconnect_scheduled',
      provider: 'rabbitmq',
      attempt: this.reconnectAttempts,
      delay,
    });

    setTimeout(async () => {
      try {
        await this.connect();
        await this.subscribe();
        this.reconnectAttempts = 0;
        logger.info('Reconnection successful', {
          operation: 'reconnect_success',
          provider: 'rabbitmq',
        });
      } catch (error) {
        logger.error('Reconnection failed', {
          operation: 'reconnect_error',
          provider: 'rabbitmq',
          error: error instanceof Error ? error.message : String(error),
        });
        await this.handleReconnect();
      }
    }, delay);
  }

  /**
   * Stop the consumer gracefully
   */
  async stop(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      logger.info('RabbitMQ consumer stopped', {
        operation: 'consumer_stop',
        provider: 'rabbitmq',
      });
    } catch (error) {
      logger.error('Error stopping RabbitMQ consumer', {
        operation: 'consumer_stop_error',
        provider: 'rabbitmq',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// Export singleton instance
export const rabbitmqConsumer = new RabbitMQConsumer();
