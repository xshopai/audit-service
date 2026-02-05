/**
 * Messaging Module
 * Provides a unified messaging abstraction layer supporting multiple providers
 *
 * Usage:
 *   import { getMessagingProvider, closeMessagingProvider } from './messaging/index.js';
 *
 *   const provider = await getMessagingProvider();
 *   await provider.publishEvent('topic.name', { data: 'value' }, 'correlation-id');
 *
 * Configuration:
 *   Set MESSAGING_PROVIDER environment variable to one of:
 *   - 'dapr' (default) - Uses Dapr pub/sub
 *   - 'rabbitmq' - Direct RabbitMQ connection
 *   - 'servicebus' - Azure Service Bus
 */

// Types and interfaces
export { MessagingProvider, MessagingProviderType, CloudEvent, buildCloudEvent } from './provider.js';

// Factory functions (recommended usage)
export { getMessagingProvider, closeMessagingProvider, resetMessagingProvider } from './factory.js';
