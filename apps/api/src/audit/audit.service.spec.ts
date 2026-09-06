import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from './audit.service.js';

describe('AuditService', () => {
  let service: AuditService;

  const mockPrismaService = {
    client: {
      orm: {
        public: {
          AuditLog: {
            create: jest.fn(),
            all: jest.fn(),
          },
        },
      },
    },
  };

  const mockAuditLog = {
    id: 1,
    userId: 1,
    action: 'DEPOSIT_COMPLETED',
    entity: 'TRANSACTION',
    entityId: '100',
    metadata: JSON.stringify({
      amount: 50000,
      currency: 'NGN',
    }),
    createdAt: '2026-09-06T10:00:00.000Z',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /*
   * ==========================================
   * CREATE
   * ==========================================
   */

  describe('create', () => {
    it('should create an audit log successfully', async () => {
      mockPrismaService.client.orm.public.AuditLog.create.mockResolvedValue(
        mockAuditLog,
      );

      const result = await service.create({
        userId: 1,
        action: 'DEPOSIT_COMPLETED',
        entity: 'TRANSACTION',
        entityId: '100',
        metadata: JSON.stringify({
          amount: 50000,
          currency: 'NGN',
        }),
      });

      expect(
        mockPrismaService.client.orm.public.AuditLog.create,
      ).toHaveBeenCalledWith({
        userId: 1,
        action: 'DEPOSIT_COMPLETED',
        entity: 'TRANSACTION',
        entityId: '100',
        metadata: JSON.stringify({
          amount: 50000,
          currency: 'NGN',
        }),
      });

      expect(result).toEqual({
        ...mockAuditLog,
        metadata: {
          amount: 50000,
          currency: 'NGN',
        },
      });
    });

    it('should use null for optional fields when they are not provided', async () => {
      mockPrismaService.client.orm.public.AuditLog.create.mockResolvedValue({
        ...mockAuditLog,
        userId: null,
        entityId: null,
        metadata: null,
      });

      await service.create({
        action: 'USER_LOGIN',
        entity: 'USER',
      });

      expect(
        mockPrismaService.client.orm.public.AuditLog.create,
      ).toHaveBeenCalledWith({
        userId: null,
        action: 'USER_LOGIN',
        entity: 'USER',
        entityId: null,
        metadata: null,
      });
    });

    it('should keep invalid JSON metadata as a string', async () => {
      const invalidMetadata = 'not-valid-json';

      mockPrismaService.client.orm.public.AuditLog.create.mockResolvedValue({
        ...mockAuditLog,
        metadata: invalidMetadata,
      });

      const result = await service.create({
        userId: 1,
        action: 'TEST_ACTION',
        entity: 'TEST_ENTITY',
        metadata: invalidMetadata,
      });

      expect(result.metadata).toBe(invalidMetadata);
    });
  });

  /*
   * ==========================================
   * FIND ALL
   * ==========================================
   */

  describe('findAll', () => {
    const auditLogs = [
      {
        ...mockAuditLog,
        id: 1,
        action: 'DEPOSIT_COMPLETED',
        entity: 'TRANSACTION',
        userId: 1,
        createdAt: '2026-09-01T10:00:00.000Z',
      },
      {
        ...mockAuditLog,
        id: 2,
        action: 'WITHDRAWAL_COMPLETED',
        entity: 'TRANSACTION',
        userId: 2,
        createdAt: '2026-09-03T10:00:00.000Z',
      },
      {
        ...mockAuditLog,
        id: 3,
        action: 'WALLET_CREATED',
        entity: 'WALLET',
        userId: 1,
        createdAt: '2026-09-05T10:00:00.000Z',
      },
    ];

    it('should return audit logs sorted newest first', async () => {
      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue(
        auditLogs,
      );

      const result = await service.findAll();

      expect(result.data).toHaveLength(3);

      expect(result.data[0].id).toBe(3);
      expect(result.data[1].id).toBe(2);
      expect(result.data[2].id).toBe(1);

      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
      });
    });

    it('should filter audit logs by action', async () => {
      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue(
        auditLogs,
      );

      const result = await service.findAll({
        action: 'DEPOSIT_COMPLETED',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].action).toBe('DEPOSIT_COMPLETED');
    });

    it('should filter audit logs by entity', async () => {
      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue(
        auditLogs,
      );

      const result = await service.findAll({
        entity: 'WALLET',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].entity).toBe('WALLET');
    });

    it('should filter audit logs by user ID', async () => {
      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue(
        auditLogs,
      );

      const result = await service.findAll({
        userId: 1,
      });

      expect(result.data).toHaveLength(2);

      expect(
        result.data.every((log: { userId: number }) => log.userId === 1),
      ).toBe(true);
    });

    it('should paginate audit logs correctly', async () => {
      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue(
        auditLogs,
      );

      const result = await service.findAll({
        page: 2,
        limit: 1,
      });

      expect(result.data).toHaveLength(1);

      // Sorted newest first:
      // ID 3, ID 2, ID 1
      // Page 2 with limit 1 should return ID 2
      expect(result.data[0].id).toBe(2);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 1,
        total: 3,
        totalPages: 3,
      });
    });

    it('should enforce maximum limit of 100', async () => {
      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue([]);

      const result = await service.findAll({
        limit: 500,
      });

      expect(result.pagination.limit).toBe(100);
    });

    it('should use default values for invalid page and limit', async () => {
      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue([]);

      const result = await service.findAll({
        page: 0,
        limit: 0,
      });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should return empty pagination when no audit logs exist', async () => {
      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result.data).toEqual([]);

      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });
  });

  /*
   * ==========================================
   * FIND BY USER
   * ==========================================
   */

  describe('findByUser', () => {
    it('should return audit logs for a specific user', async () => {
      const auditLogs = [
        {
          ...mockAuditLog,
          id: 1,
          userId: 1,
          createdAt: '2026-09-01T10:00:00.000Z',
        },
        {
          ...mockAuditLog,
          id: 2,
          userId: 2,
          createdAt: '2026-09-02T10:00:00.000Z',
        },
      ];

      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue(
        auditLogs,
      );

      const result = await service.findByUser(1);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe(1);
    });

    it('should support additional filters when finding by user', async () => {
      const auditLogs = [
        {
          ...mockAuditLog,
          id: 1,
          userId: 1,
          action: 'DEPOSIT_COMPLETED',
          entity: 'TRANSACTION',
          createdAt: '2026-09-01T10:00:00.000Z',
        },
        {
          ...mockAuditLog,
          id: 2,
          userId: 1,
          action: 'WALLET_CREATED',
          entity: 'WALLET',
          createdAt: '2026-09-02T10:00:00.000Z',
        },
      ];

      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue(
        auditLogs,
      );

      const result = await service.findByUser(1, {
        action: 'WALLET_CREATED',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].action).toBe('WALLET_CREATED');
    });
  });

  /*
   * ==========================================
   * FIND BY ENTITY
   * ==========================================
   */

  describe('findByEntity', () => {
    it('should return audit logs for a specific entity', async () => {
      const auditLogs = [
        {
          ...mockAuditLog,
          id: 1,
          entity: 'TRANSACTION',
          createdAt: '2026-09-01T10:00:00.000Z',
        },
        {
          ...mockAuditLog,
          id: 2,
          entity: 'WALLET',
          createdAt: '2026-09-02T10:00:00.000Z',
        },
      ];

      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue(
        auditLogs,
      );

      const result = await service.findByEntity('TRANSACTION');

      expect(result).toHaveLength(1);
      expect(result[0].entity).toBe('TRANSACTION');
    });

    it('should filter audit logs by entity and entity ID', async () => {
      const auditLogs = [
        {
          ...mockAuditLog,
          id: 1,
          entity: 'TRANSACTION',
          entityId: '100',
          createdAt: '2026-09-01T10:00:00.000Z',
        },
        {
          ...mockAuditLog,
          id: 2,
          entity: 'TRANSACTION',
          entityId: '200',
          createdAt: '2026-09-02T10:00:00.000Z',
        },
      ];

      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue(
        auditLogs,
      );

      const result = await service.findByEntity('TRANSACTION', '100');

      expect(result).toHaveLength(1);
      expect(result[0].entityId).toBe('100');
    });

    it('should sort entity audit logs newest first', async () => {
      const auditLogs = [
        {
          ...mockAuditLog,
          id: 1,
          entity: 'TRANSACTION',
          createdAt: '2026-09-01T10:00:00.000Z',
        },
        {
          ...mockAuditLog,
          id: 2,
          entity: 'TRANSACTION',
          createdAt: '2026-09-05T10:00:00.000Z',
        },
      ];

      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue(
        auditLogs,
      );

      const result = await service.findByEntity('TRANSACTION');

      expect(result[0].id).toBe(2);
      expect(result[1].id).toBe(1);
    });
  });

  /*
   * ==========================================
   * FIND BY ACTION
   * ==========================================
   */

  describe('findByAction', () => {
    it('should return audit logs matching an action', async () => {
      const auditLogs = [
        {
          ...mockAuditLog,
          id: 1,
          action: 'DEPOSIT_COMPLETED',
          createdAt: '2026-09-01T10:00:00.000Z',
        },
        {
          ...mockAuditLog,
          id: 2,
          action: 'WITHDRAWAL_COMPLETED',
          createdAt: '2026-09-02T10:00:00.000Z',
        },
      ];

      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue(
        auditLogs,
      );

      const result = await service.findByAction('DEPOSIT_COMPLETED');

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('DEPOSIT_COMPLETED');
    });

    it('should sort action audit logs newest first', async () => {
      const auditLogs = [
        {
          ...mockAuditLog,
          id: 1,
          action: 'DEPOSIT_COMPLETED',
          createdAt: '2026-09-01T10:00:00.000Z',
        },
        {
          ...mockAuditLog,
          id: 2,
          action: 'DEPOSIT_COMPLETED',
          createdAt: '2026-09-05T10:00:00.000Z',
        },
      ];

      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue(
        auditLogs,
      );

      const result = await service.findByAction('DEPOSIT_COMPLETED');

      expect(result[0].id).toBe(2);
      expect(result[1].id).toBe(1);
    });

    it('should return an empty array when no action matches', async () => {
      mockPrismaService.client.orm.public.AuditLog.all.mockResolvedValue([]);

      const result = await service.findByAction('UNKNOWN_ACTION');

      expect(result).toEqual([]);
    });
  });
});