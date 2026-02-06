/**
 * Secret Management Service
 * Provides secret management using environment variables.
 */

import logger from '../core/logger.js';

class SecretManager {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';

    logger.info('Secret manager initialized', null, {
      event: 'secret_manager_init',
      environment: this.environment,
      source: 'env',
    });
  }

  /**
   * Get a secret value from environment variables
   * @param {string} secretName - Name of the secret to retrieve
   * @returns {string} Secret value
   * @throws {Error} If secret is not found
   */
  getSecret(secretName) {
    const value = process.env[secretName];

    if (!value) {
      throw new Error(`Secret '${secretName}' not found in environment variables`);
    }

    logger.debug('Retrieved secret from environment', null, {
      event: 'secret_retrieved',
      secretName,
      source: 'env',
    });

    return value;
  }

  /**
   * Get JWT configuration from environment variables
   * @returns {Object} JWT configuration parameters
   */
  getJwtConfig() {
    const secret = this.getSecret('JWT_SECRET');

    return {
      secret,
      algorithm: process.env.JWT_ALGORITHM || 'HS256',
      expiration: parseInt(process.env.JWT_EXPIRATION || '3600', 10),
      issuer: process.env.JWT_ISSUER || 'auth-service',
      audience: process.env.JWT_AUDIENCE || 'xshopai-platform',
    };
  }

  /**
   * Get database configuration from environment variables
   * @returns {Object} Database configuration parameters
   */
  getDatabaseConfig() {
    const mongodbUri = this.getSecret('MONGODB_URI');

    return {
      uri: mongodbUri,
      dbName: process.env.MONGODB_DB_NAME || 'audit_service_db',
    };
  }
}

// Global instance
export const secretManager = new SecretManager();

// Helper functions for easy access
export const getJwtConfig = () => secretManager.getJwtConfig();
export const getDatabaseConfig = () => secretManager.getDatabaseConfig();
