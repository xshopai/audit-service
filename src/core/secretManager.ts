/**
 * Dapr Secret Management Service for Audit Service
 * Provides secret management using Dapr's secret store building block.
 */

// Module-level check to prevent Dapr SDK loading when not needed
const MESSAGING_PROVIDER = process.env.MESSAGING_PROVIDER || 'dapr';
const shouldUseDapr = MESSAGING_PROVIDER === 'dapr';

import logger from './logger.js';
import { config } from '../config/index.js';

// Lazy import Dapr SDK
let DaprClient: any = null;

async function loadDaprSdk() {
  if (!DaprClient && shouldUseDapr) {
    const daprModule = await import('@dapr/dapr');
    DaprClient = daprModule.DaprClient;
  }
}

class DaprSecretManager {
  private daprHost: string;
  private daprPort: number;
  private secretStoreName: string;
  private shouldUseDapr: boolean;

  constructor() {
    this.daprHost = config.dapr.host;
    this.daprPort = config.dapr.httpPort;
    this.secretStoreName = config.dapr.secretStoreName;
    this.shouldUseDapr = shouldUseDapr;

    logger.info('Secret manager initialized', {
      event: 'secret_manager_init',
      secretStore: this.secretStoreName,
      daprHost: this.daprHost,
      daprPort: this.daprPort,
      daprEnabled: this.shouldUseDapr,
    });
  }

  /**
   * Get a secret value from Dapr secret store
   * @param secretName - Name of the secret to retrieve
   * @returns Secret value or null if not found
   */
  async getSecret(secretName: string): Promise<string | null> {
    if (!this.shouldUseDapr) {
      // When not using Dapr, return null to fall back to environment variables
      return null;
    }

    try {
      await loadDaprSdk();
      const client = new DaprClient({
        daprHost: this.daprHost,
        daprPort: String(this.daprPort),
      });

      const response = await client.secret.get(this.secretStoreName, secretName);

      // Dapr returns an object like { secretName: 'value' }
      if (response && secretName in response) {
        const value = (response as Record<string, unknown>)[secretName];
        logger.debug('Retrieved secret from Dapr', {
          event: 'secret_retrieved',
          secretName,
          source: 'dapr',
          store: this.secretStoreName,
        });
        return String(value);
      }

      logger.debug('Secret not found in Dapr store, will use fallback', {
        event: 'secret_not_found',
        secretName,
        store: this.secretStoreName,
      });
      return null;
    } catch (error) {
      logger.debug(`Failed to get secret from Dapr, will use fallback: ${(error as Error).message}`, {
        event: 'secret_retrieval_error',
        secretName,
        error: (error as Error).message,
        store: this.secretStoreName,
      });
      return null;
    }
  }

  /**
   * Get database configuration from secrets
   * @returns Database connection parameters
   */
  async getDatabaseConfig(): Promise<{
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
  }> {
    const [host, port, database, username, password, ssl] = await Promise.all([
      this.getSecret('POSTGRES_HOST'),
      this.getSecret('POSTGRES_PORT'),
      this.getSecret('POSTGRES_DB'),
      this.getSecret('POSTGRES_USER'),
      this.getSecret('POSTGRES_PASSWORD'),
      this.getSecret('DB_SSL'),
    ]);

    // Use environment variables as fallback
    return {
      host: host || process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(port || process.env.POSTGRES_PORT || '5432', 10),
      database: database || process.env.POSTGRES_DB || 'audit_service_db',
      username: username || process.env.POSTGRES_USER || 'postgres',
      password: password || process.env.POSTGRES_PASSWORD || 'password',
      ssl: (ssl || process.env.DB_SSL || 'false') === 'true',
    };
  }

  /**
   * Get message broker configuration from secrets
   * @returns Message broker configuration parameters
   */
  async getMessageBrokerConfig(): Promise<{
    url: string;
    queue: string;
  }> {
    const [url, queue] = await Promise.all([
      this.getSecret('MESSAGE_BROKER_URL'),
      this.getSecret('MESSAGE_BROKER_QUEUE'),
    ]);

    if (!url || !queue) {
      throw new Error('Missing required message broker secrets from Dapr');
    }

    return {
      url,
      queue,
    };
  }

  /**
   * Get JWT configuration from secrets
   * @returns JWT configuration parameters
   */
  async getJwtConfig(): Promise<{
    secret: string;
  }> {
    const secret = await this.getSecret('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET not found in Dapr secret store');
    }

    return {
      secret,
    };
  }
}

// Global instance
export const secretManager = new DaprSecretManager();

// Helper functions for easy access
export const getDatabaseConfig = () => secretManager.getDatabaseConfig();
export const getMessageBrokerConfig = () => secretManager.getMessageBrokerConfig();
export const getJwtConfig = () => secretManager.getJwtConfig();
