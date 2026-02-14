/**
 * Unit tests for Audit Log Service
 */

import { AuditLogService, AuditLogEntry } from '../../../src/services/audit.service.js';
import { createMockEvent } from '../../helpers.js';

// Mock the database
jest.mock('../../../src/db/index.js', () => ({
  getDatabasePool: jest.fn(() => ({
    query: jest.fn(),
  })),
}));

// Mock the logger
jest.mock('../../../src/core/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { getDatabasePool } from '../../../src/db/index.js';
import logger from '../../../src/core/logger.js';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockPool: {
    query: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = {
      query: jest.fn(),
    };
    (getDatabasePool as jest.Mock).mockReturnValue(mockPool);

    // Get a fresh instance using the singleton pattern
    service = (AuditLogService as any).getInstance();
  });

  describe('writeAuditLog', () => {
    const validAuditEntry: AuditLogEntry = {
      traceId: 'trace-123',
      spanId: 'span-456',
      eventType: 'user.created',
      eventAction: 'CREATE',
      serviceName: 'user-service',
      userId: 'user-789',
      resourceId: 'resource-101',
      resourceType: 'user',
      eventData: { email: 'test@example.com' },
      metadata: { version: '1.0' },
      ipAddress: '192.168.1.1',
      userAgent: 'TestAgent/1.0',
    };

    it('should write audit log to database successfully', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 1, created_at: new Date() }],
      });

      await service.writeAuditLog(validAuditEntry);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          validAuditEntry.traceId,
          validAuditEntry.spanId,
          validAuditEntry.eventType,
          validAuditEntry.eventAction,
          validAuditEntry.serviceName,
        ]),
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[SUCCESS] Audit log written to database',
        expect.objectContaining({
          eventType: 'user.created',
          eventAction: 'CREATE',
        }),
      );
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.writeAuditLog(validAuditEntry)).rejects.toThrow('Database connection failed');

      expect(logger.error).toHaveBeenCalledWith(
        '[ERROR] Failed to write audit log to database',
        expect.objectContaining({
          error: 'Database connection failed',
        }),
      );
    });

    it('should handle entry without optional fields', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 1, created_at: new Date() }],
      });

      const minimalEntry: AuditLogEntry = {
        traceId: 'trace-123',
        eventType: 'system.health',
        eventAction: 'CHECK',
        serviceName: 'health-service',
        eventData: {},
      };

      await service.writeAuditLog(minimalEntry);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      // Check that null is passed for optional fields
      const callArgs = mockPool.query.mock.calls[0][1];
      expect(callArgs).toContain(null); // spanId
    });
  });

  describe('writeAuditLogFromEvent', () => {
    it('should convert event to audit log entry', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 1, created_at: new Date() }],
      });

      const mockEvent = createMockEvent('user.created', {
        userId: 'user-123',
        email: 'test@example.com',
        createdBy: 'admin',
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      await service.writeAuditLogFromEvent('user.created', 'CREATE', mockEvent, {
        resourceType: 'user',
      });

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining(['user.created', 'CREATE']),
      );
    });

    it('should use fallback values for missing metadata', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 1, created_at: new Date() }],
      });

      const eventWithoutMetadata = {
        eventId: 'evt-123',
        eventType: 'order.created',
        timestamp: new Date().toISOString(),
        source: 'order-service',
        data: { orderId: 'order-456' },
      };

      await service.writeAuditLogFromEvent('order.created', 'CREATE', eventWithoutMetadata, {
        resourceType: 'order',
        resourceId: 'order-456',
      });

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAuditLogs', () => {
    const mockLogs = [
      {
        id: 1,
        trace_id: 'trace-1',
        event_type: 'user.created',
        event_action: 'CREATE',
        service_name: 'user-service',
        timestamp: new Date(),
      },
      {
        id: 2,
        trace_id: 'trace-2',
        event_type: 'user.updated',
        event_action: 'UPDATE',
        service_name: 'user-service',
        timestamp: new Date(),
      },
    ];

    it('should retrieve audit logs with default pagination', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: '10' }] }).mockResolvedValueOnce({ rows: mockLogs });

      const result = await service.getAuditLogs();

      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should apply userId filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: '5' }] }).mockResolvedValueOnce({ rows: [mockLogs[0]] });

      const result = await service.getAuditLogs({ userId: 'user-123' });

      expect(result.total).toBe(5);
      // Check that the first query contains user_id filter
      expect(mockPool.query.mock.calls[0][0]).toContain('user_id');
    });

    it('should apply eventType filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: '3' }] }).mockResolvedValueOnce({ rows: [mockLogs[0]] });

      await service.getAuditLogs({ eventType: 'user.created' });

      expect(mockPool.query.mock.calls[0][0]).toContain('event_type');
    });

    it('should apply serviceName filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: '8' }] }).mockResolvedValueOnce({ rows: mockLogs });

      await service.getAuditLogs({ serviceName: 'user-service' });

      expect(mockPool.query.mock.calls[0][0]).toContain('service_name');
    });

    it('should apply traceId filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: '1' }] }).mockResolvedValueOnce({ rows: [mockLogs[0]] });

      await service.getAuditLogs({ traceId: 'trace-1' });

      expect(mockPool.query.mock.calls[0][0]).toContain('trace_id');
    });

    it('should apply date range filters', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: '2' }] }).mockResolvedValueOnce({ rows: mockLogs });

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      await service.getAuditLogs({ startDate, endDate });

      expect(mockPool.query.mock.calls[0][0]).toContain('timestamp >=');
      expect(mockPool.query.mock.calls[0][0]).toContain('timestamp <=');
    });

    it('should apply custom pagination', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: '100' }] }).mockResolvedValueOnce({ rows: mockLogs });

      await service.getAuditLogs({ limit: 20, offset: 40 });

      // Check that limit and offset are in the params
      const dataQueryParams = mockPool.query.mock.calls[1][1];
      expect(dataQueryParams).toContain(20);
      expect(dataQueryParams).toContain(40);
    });

    it('should handle database errors when retrieving logs', async () => {
      mockPool.query.mockRejectedValue(new Error('Query failed'));

      await expect(service.getAuditLogs()).rejects.toThrow('Query failed');

      expect(logger.error).toHaveBeenCalledWith(
        '[ERROR] Failed to retrieve audit logs',
        expect.objectContaining({
          error: 'Query failed',
        }),
      );
    });

    it('should combine multiple filters', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: '1' }] }).mockResolvedValueOnce({ rows: [mockLogs[0]] });

      await service.getAuditLogs({
        userId: 'user-123',
        eventType: 'user.created',
        serviceName: 'user-service',
      });

      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('user_id');
      expect(query).toContain('event_type');
      expect(query).toContain('service_name');
      expect(query).toContain('AND');
    });
  });
});
