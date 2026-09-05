import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { AuditService } from '../audit/audit.service.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TransactionsService } from './transactions.service.js';

describe('TransactionsService', () => {
  let service: TransactionsService;

  const mockPrismaService = {
    client: {
      orm: {
        public: {
          Wallet: {
            all: jest.fn(),
            first: jest.fn(),
            where: jest.fn(),
          },
          Transaction: {
            all: jest.fn(),
            first: jest.fn(),
            create: jest.fn(),
            where: jest.fn(),
          },
        },
      },
      transaction: jest.fn(),
    },
  };

  const mockLedgerService = {
    reverseTransaction: jest.fn(),
  };

  const mockAuditService = {
    create: jest.fn(),
  };

  const userId = 1;

  const mockWallets = [
    {
      id: 1,
      userId: 1,
      currency: 'NGN',
      balance: 10000n,
      status: 'ACTIVE',
    },
    {
      id: 2,
      userId: 1,
      currency: 'USD',
      balance: 5000n,
      status: 'ACTIVE',
    },
    {
      id: 3,
      userId: 2,
      currency: 'NGN',
      balance: 20000n,
      status: 'ACTIVE',
    },
  ];

  const mockTransactions = [
    {
      id: 1,
      reference: 'TXN-001',
      type: 'DEPOSIT',
      status: 'COMPLETED',
      amount: 5000n,
      currency: 'NGN',
      sourceWalletId: null,
      destinationWalletId: 1,
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
    },
    {
      id: 2,
      reference: 'TXN-002',
      type: 'WITHDRAWAL',
      status: 'COMPLETED',
      amount: 1000n,
      currency: 'NGN',
      sourceWalletId: 1,
      destinationWalletId: null,
      createdAt: new Date('2026-09-02T10:00:00.000Z'),
    },
    {
      id: 3,
      reference: 'TXN-003',
      type: 'TRANSFER',
      status: 'PENDING',
      amount: 2000n,
      currency: 'NGN',
      sourceWalletId: 1,
      destinationWalletId: 3,
      createdAt: new Date('2026-09-03T10:00:00.000Z'),
    },
    {
      id: 4,
      reference: 'TXN-004',
      type: 'DEPOSIT',
      status: 'FAILED',
      amount: 3000n,
      currency: 'NGN',
      sourceWalletId: null,
      destinationWalletId: 1,
      createdAt: new Date('2026-09-04T10:00:00.000Z'),
    },
    {
      id: 5,
      reference: 'TXN-005',
      type: 'TRANSFER',
      status: 'REVERSED',
      amount: 1500n,
      currency: 'NGN',
      sourceWalletId: 1,
      destinationWalletId: 3,
      createdAt: new Date('2026-09-05T10:00:00.000Z'),
    },
    {
      id: 6,
      reference: 'TXN-006',
      type: 'DEPOSIT',
      status: 'COMPLETED',
      amount: 8000n,
      currency: 'NGN',
      sourceWalletId: null,
      destinationWalletId: 3,
      createdAt: new Date('2026-09-06T10:00:00.000Z'),
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LedgerService,
          useValue: mockLedgerService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);

    mockPrismaService.client.orm.public.Wallet.all.mockResolvedValue(
      mockWallets,
    );

    mockPrismaService.client.orm.public.Transaction.all.mockResolvedValue(
      mockTransactions,
    );

    mockAuditService.create.mockResolvedValue({
      id: 1,
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /* =====================================================
     FIND ALL TRANSACTIONS
  ===================================================== */

  describe('findAll', () => {
    it('should return only transactions belonging to the authenticated user', async () => {
      const result = await service.findAll(userId);

      expect(result.meta.total).toBe(5);

      expect(result.data).toHaveLength(5);

      expect(result.data.every((transaction: any) => {
        return transaction.destinationWalletId === '1' ||
          transaction.sourceWalletId === '1' ||
          transaction.destinationWalletId === 1 ||
          transaction.sourceWalletId === 1;
      })).toBe(true);
    });

    it('should paginate transactions correctly', async () => {
      const result = await service.findAll(userId, {
        page: 1,
        limit: 2,
      });

      expect(result.data).toHaveLength(2);

      expect(result.meta).toEqual({
        total: 5,
        page: 1,
        limit: 2,
        totalPages: 3,
        hasPreviousPage: false,
        hasNextPage: true,
      });
    });

    it('should filter transactions by type', async () => {
      const result = await service.findAll(userId, {
        type: 'DEPOSIT',
      });

      expect(result.meta.total).toBe(2);

      expect(
        result.data.every(
          (transaction: any) => transaction.type === 'DEPOSIT',
        ),
      ).toBe(true);
    });

    it('should filter transactions by status', async () => {
      const result = await service.findAll(userId, {
        status: 'COMPLETED',
      });

      expect(result.meta.total).toBe(2);

      expect(
        result.data.every(
          (transaction: any) => transaction.status === 'COMPLETED',
        ),
      ).toBe(true);
    });

    it('should filter transactions by currency', async () => {
      const result = await service.findAll(userId, {
        currency: 'NGN',
      });

      expect(result.meta.total).toBe(5);
    });

    it('should search transactions by reference', async () => {
      const result = await service.findAll(userId, {
        search: 'TXN-003',
      });

      expect(result.meta.total).toBe(1);

      expect(result.data[0].reference).toBe('TXN-003');
    });

    it('should search transactions by ID', async () => {
      const result = await service.findAll(userId, {
        search: '2',
      });

      expect(result.meta.total).toBe(1);

      expect(result.data[0].id).toBe(2);
    });

    it('should enforce maximum page limit of 100', async () => {
      const result = await service.findAll(userId, {
        limit: 500,
      });

      expect(result.meta.limit).toBe(100);
    });

    it('should use default page and limit for invalid pagination values', async () => {
      const result = await service.findAll(userId, {
        page: -1,
        limit: -10,
      });

      expect(result.meta.page).toBe(1);

      expect(result.meta.limit).toBe(10);
    });
  });

  /* =====================================================
     GET SUMMARY
  ===================================================== */

  describe('getSummary', () => {
    it('should return correct transaction summary', async () => {
      const result = await service.getSummary(userId);

      expect(result).toEqual({
        totalTransactions: 5,
        totalDeposits: '5000',
        totalWithdrawals: '1000',
        totalTransfers: '2000',
        completedTransactions: 2,
        pendingTransactions: 1,
        failedTransactions: 1,
        reversedTransactions: 1,
      });
    });

    it('should return empty summary when user has no transactions', async () => {
      mockPrismaService.client.orm.public.Wallet.all.mockResolvedValue([]);

      const result = await service.getSummary(userId);

      expect(result).toEqual({
        totalTransactions: 0,
        totalDeposits: '0',
        totalWithdrawals: '0',
        totalTransfers: '0',
        completedTransactions: 0,
        pendingTransactions: 0,
        failedTransactions: 0,
        reversedTransactions: 0,
      });
    });
  });

  /* =====================================================
     RECENT TRANSACTIONS
  ===================================================== */

  describe('getRecentTransactions', () => {
    it('should return most recent transactions first', async () => {
      const result = await service.getRecentTransactions(userId, 3);

      expect(result).toHaveLength(3);

      expect(result[0].id).toBe(5);

      expect(result[1].id).toBe(4);

      expect(result[2].id).toBe(3);
    });

    it('should use default limit when invalid limit is provided', async () => {
      const result = await service.getRecentTransactions(userId, -1);

      expect(result).toHaveLength(5);
    });

    it('should enforce maximum recent transaction limit of 100', async () => {
      const result = await service.getRecentTransactions(userId, 500);

      expect(result).toHaveLength(5);
    });
  });

  /* =====================================================
     FIND ONE
  ===================================================== */

  describe('findOne', () => {
    it('should return transaction when user has access', async () => {
      const transaction = mockTransactions[0];

      mockPrismaService.client.orm.public.Transaction.first.mockResolvedValue(
        transaction,
      );

      const result = await service.findOne(userId, transaction.id);

      expect(
        mockPrismaService.client.orm.public.Transaction.first,
      ).toHaveBeenCalledWith({
        id: transaction.id,
      });

      expect(result.id).toBe(transaction.id);

      expect(result.amount).toBe('5000');

      expect(mockAuditService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'TRANSACTION_VIEWED',
          entity: 'Transaction',
          entityId: String(transaction.id),
        }),
      );
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      mockPrismaService.client.orm.public.Transaction.first.mockResolvedValue(
        null,
      );

      await expect(
        service.findOne(userId, 999),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own transaction', async () => {
      mockPrismaService.client.orm.public.Transaction.first.mockResolvedValue(
        mockTransactions[5],
      );

      await expect(
        service.findOne(userId, 6),
      ).rejects.toThrow(ForbiddenException);

      expect(mockAuditService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'TRANSACTION_ACCESS_DENIED',
        }),
      );
    });
  });

  /* =====================================================
     FIND BY REFERENCE
  ===================================================== */

  describe('findByReference', () => {
    it('should return transaction by reference when user has access', async () => {
      const transaction = mockTransactions[1];

      mockPrismaService.client.orm.public.Transaction.first.mockResolvedValue(
        transaction,
      );

      const result = await service.findByReference(
        userId,
        'TXN-002',
      );

      expect(
        mockPrismaService.client.orm.public.Transaction.first,
      ).toHaveBeenCalledWith({
        reference: 'TXN-002',
      });

      expect(result.id).toBe(2);

      expect(mockAuditService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TRANSACTION_VIEWED',
        }),
      );
    });

    it('should throw NotFoundException when reference does not exist', async () => {
      mockPrismaService.client.orm.public.Transaction.first.mockResolvedValue(
        null,
      );

      await expect(
        service.findByReference(userId, 'UNKNOWN'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own transaction', async () => {
      mockPrismaService.client.orm.public.Transaction.first.mockResolvedValue(
        mockTransactions[5],
      );

      await expect(
        service.findByReference(userId, 'TXN-006'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  /* =====================================================
     MONITORING SUMMARY
  ===================================================== */

  describe('getMonitoringSummary', () => {
    it('should return transaction monitoring statistics', async () => {
      const result = await service.getMonitoringSummary(userId);

      expect(result.overview.totalTransactions).toBe(5);

      expect(result.overview.completedTransactions).toBe(2);

      expect(result.overview.pendingTransactions).toBe(1);

      expect(result.overview.failedTransactions).toBe(1);

      expect(result.overview.reversedTransactions).toBe(1);

      expect(result.transactionTypes).toEqual({
        deposits: 2,
        withdrawals: 1,
        transfers: 2,
      });

      expect(result.financialVolume).toEqual({
        total: '8000',
        deposits: '5000',
        withdrawals: '1000',
        transfers: '2000',
      });
    });

    it('should filter monitoring summary by currency', async () => {
      const result = await service.getMonitoringSummary(userId, {
        currency: 'USD',
      });

      expect(result.overview.totalTransactions).toBe(0);
    });
  });

  /* =====================================================
     MONITORING TRANSACTIONS
  ===================================================== */

  describe('getMonitoringTransactions', () => {
    it('should return paginated monitoring transactions', async () => {
      const result = await service.getMonitoringTransactions(userId, {
        page: 1,
        limit: 2,
      });

      expect(result.data).toHaveLength(2);

      expect(result.meta.total).toBe(5);

      expect(result.meta.totalPages).toBe(3);

      expect(result.meta.hasNextPage).toBe(true);
    });

    it('should filter monitoring transactions by type and status', async () => {
      const result = await service.getMonitoringTransactions(userId, {
        type: 'TRANSFER',
        status: 'PENDING',
      });

      expect(result.meta.total).toBe(1);

      expect(result.data[0].reference).toBe('TXN-003');
    });

    it('should filter monitoring transactions by amount range', async () => {
      const result = await service.getMonitoringTransactions(userId, {
        minAmount: 1500n,
        maxAmount: 2500n,
      });

      expect(result.meta.total).toBe(2);
    });

    it('should search monitoring transactions by reference', async () => {
      const result = await service.getMonitoringTransactions(userId, {
        search: 'TXN-002',
      });

      expect(result.meta.total).toBe(1);

      expect(result.data[0].id).toBe(2);
    });
  });

  /* =====================================================
     TRANSACTION ANALYTICS
  ===================================================== */

  describe('getAnalytics', () => {
    it('should return transaction analytics structure', async () => {
      const now = new Date();

      const recentTransactions = mockTransactions.map(
        (transaction) => ({
          ...transaction,
          createdAt: now,
        }),
      );

      mockPrismaService.client.orm.public.Transaction.all.mockResolvedValue(
        recentTransactions,
      );

      const result = await service.getAnalytics(userId, 30);

      expect(result.period.days).toBe(30);

      expect(result.overview.totalTransactions).toBe(5);

      expect(result.byType).toHaveLength(3);

      expect(result.byStatus).toHaveLength(5);

      expect(result.charts).toHaveProperty('daily');

      expect(result.charts).toHaveProperty('weekly');

      expect(result.charts).toHaveProperty('monthly');
    });

    it('should use default analytics period when invalid days is provided', async () => {
      const result = await service.getAnalytics(userId, -1);

      expect(result.period.days).toBe(30);
    });

    it('should enforce maximum analytics period of 365 days', async () => {
      const result = await service.getAnalytics(userId, 500);

      expect(result.period.days).toBe(365);
    });
  });
});