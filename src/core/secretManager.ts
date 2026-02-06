/**
 * Secret Management Service for Audit Service
 * Provides secret management using environment variables.
 */

import logger from './logger.js';

class SecretManager {
  constructor() {
    logger.info('Secret manager initialized', {
      event: 'secret_manager_init',
      source: 'env',
    });
  }

  /**
   * Get a secret value from environment variables
   * @param secretName - Name of the secret to retrieve
   * @returns Secret value or null if not found
   */
  getSecret(secretName: string): string | null {
    const value = process.env[secretName];
    if (value) {
      logger.debug('Retrieved secret from environment', {
        event: 'secret_retrieved',
        secretName,
        source: 'env',
      });
      return value;
    }
    return null;
  }

  /**
   * Get database configuration from environment variables
   * @returns Database connection parameters
   */
  getDatabaseConfig(): {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
  } {
    return {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'audit_service_db',
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
      ssl: (process.env.DB_SSL || 'false') === 'true',
    };
  }

  /**
   * Get message broker configuration from environment variables
   * @returns Message broker configuration parameters
   */
  getMessageBrokerConfig(): {
    url: string;
    queue: string;
  } {
    const url = process.env.MESSAGE_BROKER_URL;
    const queue = process.env.MESSAGE_BROKER_QUEUE;

    if (!url || !queue) {
      throw new Error('Missing required MESSAGE_BROKER_URL or MESSAGE_BROKER_QUEUE environment variables');
    }

    return {
      url,
      queue,
    };
  }

  /**
   * Get JWT configuration from environment variables
   * @returns JWT configuration parameters
   */
  getJwtConfig(): {
    secret: string;
  } {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET environment variable not found');
    }

    return {
      secret,
    };
  }
}

// Global instance
export const secretManager = new SecretManager();

// Helper functions for easy access
export const getDatabaseConfig = () => secretManager.getDatabaseConfig();
export const getMessageBrokerConfig = () => secretManager.getMessageBrokerConfig();
export const getJwtConfig = () => secretManager.getJwtConfig();
