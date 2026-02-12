import winston from 'winston';
import { config } from '../config/index.js';

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test';
const NAME = config.service.name || 'audit-service';
const LOG_FORMAT = process.env.LOG_FORMAT || (IS_PRODUCTION ? 'json' : 'console');

/**
 * Console formatter for development with color coding
 */
const consoleFormat = winston.format.printf(({ level, message, timestamp, traceId, spanId, ...meta }) => {
  const colors: Record<string, string> = {
    error: '\x1b[31m',
    warn: '\x1b[33m',
    info: '\x1b[32m',
    debug: '\x1b[34m',
  };
  const reset = '\x1b[0m';
  const color = colors[level] || '';

  // Show first 8 chars of traceId in console for readability
  const traceIdShort = traceId && typeof traceId === 'string' ? traceId.substring(0, 8) : 'no-trace';
  const traceInfo = `[trace:${traceIdShort}]`;
  const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';

  return `${color}[${timestamp}] [${level.toUpperCase()}] ${NAME} ${traceInfo}: ${message}${metaStr}${reset}`;
});

/**
 * JSON formatter for production
 */
const jsonFormat = winston.format.printf(({ level, message, timestamp, traceId, spanId, ...meta }) => {
  return JSON.stringify({
    timestamp,
    level,
    service: NAME,
    traceId: traceId || null,
    spanId: spanId || null,
    message,
    ...meta,
  });
});

const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (IS_DEVELOPMENT ? 'debug' : 'info'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    LOG_FORMAT === 'json' ? jsonFormat : consoleFormat,
  ),
  defaultMeta: {
    version: config.service.version,
    environment: config.env,
  },
  transports: [
    new winston.transports.Console({
      silent: IS_TEST,
    }),
  ],
});

class Logger {
  info(message: string, meta?: any): void {
    winstonLogger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    winstonLogger.warn(message, meta);
  }

  error(message: string, meta?: any): void {
    winstonLogger.error(message, meta);
  }

  debug(message: string, meta?: any): void {
    winstonLogger.debug(message, meta);
  }

  business(event: string, meta?: any): void {
    winstonLogger.info(event, { ...meta, eventType: 'business' });
  }

  security(event: string, meta?: any): void {
    winstonLogger.warn(event, { ...meta, eventType: 'security' });
  }

  audit(event: string, meta?: any): void {
    winstonLogger.info(event, { ...meta, eventType: 'audit' });
  }

  /**
   * Create a logger bound to a trace context (traceId and spanId)
   */
  withTraceContext(traceId: string, spanId?: string) {
    const traceMetadata = { traceId, ...(spanId && { spanId }) };
    return {
      debug: (message: string, metadata?: any) => this.debug(message, { ...metadata, ...traceMetadata }),
      info: (message: string, metadata?: any) => this.info(message, { ...metadata, ...traceMetadata }),
      warn: (message: string, metadata?: any) => this.warn(message, { ...metadata, ...traceMetadata }),
      error: (message: string, metadata?: any) => this.error(message, { ...metadata, ...traceMetadata }),
      business: (event: string, metadata?: any) => this.business(event, { ...metadata, ...traceMetadata }),
      security: (event: string, metadata?: any) => this.security(event, { ...metadata, ...traceMetadata }),
      audit: (event: string, metadata?: any) => this.audit(event, { ...metadata, ...traceMetadata }),
    };
  }
}

const logger = new Logger();

export default logger;
export { Logger };
