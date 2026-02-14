/**
 * Unit tests for Configuration Validator
 */

// Store original env
const originalEnv = { ...process.env };

describe('Config Validator', () => {
  beforeEach(() => {
    // Reset modules and restore env
    jest.resetModules();
    process.env = { ...originalEnv };
    // Set minimum required env vars
    process.env.NODE_ENV = 'test';
    process.env.SERVICE_NAME = 'audit-service';
    process.env.PORT = '9012';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isValidPort', () => {
    it('should accept valid port numbers', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.PORT = '3000';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should accept port 80', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.PORT = '80';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should accept port 65535', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.PORT = '65535';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject port 0', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.PORT = '0';
      expect(() => validateConfig()).toThrow();
    });

    it('should reject port > 65535', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.PORT = '70000';
      expect(() => validateConfig()).toThrow();
    });

    it('should reject non-numeric port', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.PORT = 'abc';
      expect(() => validateConfig()).toThrow();
    });
  });

  describe('isValidNodeEnv', () => {
    it.each(['development', 'production', 'test'])('should accept %s', async (env) => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.NODE_ENV = env;
      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject invalid NODE_ENV', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.NODE_ENV = 'invalid';
      expect(() => validateConfig()).toThrow();
    });
  });

  describe('isValidLogLevel', () => {
    it.each(['error', 'warn', 'info', 'debug'])('should accept %s', async (level) => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.LOG_LEVEL = level;
      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject invalid log level', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.LOG_LEVEL = 'invalid';
      expect(() => validateConfig()).toThrow();
    });
  });

  describe('validateConfig', () => {
    it('should throw if required SERVICE_NAME is missing', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      delete process.env.SERVICE_NAME;
      expect(() => validateConfig()).toThrow();
    });

    it('should pass with all valid required configurations', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.SERVICE_NAME = 'audit-service';
      process.env.NODE_ENV = 'production';
      process.env.PORT = '9012';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should set default values for optional config', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      delete process.env.LOG_LEVEL;
      delete process.env.POSTGRES_PORT;
      
      validateConfig();
      
      // Defaults should be set
      expect(process.env.LOG_LEVEL).toBe('info');
      expect(process.env.POSTGRES_PORT).toBe('5432');
    });

    it('should validate DB_SSL boolean values', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.DB_SSL = 'true';
      expect(() => validateConfig()).not.toThrow();

      jest.resetModules();
      process.env.SERVICE_NAME = 'audit-service';
      const { default: validateConfig2 } = await import('../../../src/validators/config.validator.js');
      process.env.DB_SSL = 'false';
      expect(() => validateConfig2()).not.toThrow();
    });

    it('should reject invalid DB_SSL values', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.DB_SSL = 'yes';
      expect(() => validateConfig()).toThrow();
    });

    it('should validate POSTGRES_PORT', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.POSTGRES_PORT = '5432';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject invalid POSTGRES_PORT', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.POSTGRES_PORT = 'invalid';
      expect(() => validateConfig()).toThrow();
    });

    it('should validate LOG_FORMAT values', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.LOG_FORMAT = 'json';
      expect(() => validateConfig()).not.toThrow();

      jest.resetModules();
      process.env.SERVICE_NAME = 'audit-service';
      const { default: validateConfig2 } = await import('../../../src/validators/config.validator.js');
      process.env.LOG_FORMAT = 'console';
      expect(() => validateConfig2()).not.toThrow();
    });

    it('should reject invalid LOG_FORMAT', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.LOG_FORMAT = 'xml';
      expect(() => validateConfig()).toThrow();
    });

    it('should validate VERSION format', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.VERSION = '1.0.0';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject invalid VERSION format', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.VERSION = 'invalid';
      expect(() => validateConfig()).toThrow();
    });

    it('should validate DB_POOL_MIN as non-negative', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.DB_POOL_MIN = '0';
      expect(() => validateConfig()).not.toThrow();

      jest.resetModules();
      process.env.SERVICE_NAME = 'audit-service';
      const { default: validateConfig2 } = await import('../../../src/validators/config.validator.js');
      process.env.DB_POOL_MIN = '5';
      expect(() => validateConfig2()).not.toThrow();
    });

    it('should validate DB_POOL_MAX as positive', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.DB_POOL_MAX = '10';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject DB_POOL_MAX of 0', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator.js');
      process.env.DB_POOL_MAX = '0';
      expect(() => validateConfig()).toThrow();
    });
  });
});
