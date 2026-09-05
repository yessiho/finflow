import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';

describe('TransactionsController', () => {
  let controller: TransactionsController;

  const mockTransactionsService = {
    getSummary: jest.fn(),
    getRecentTransactions: jest.fn(),
    getAnalytics: jest.fn(),
    findAll: jest.fn(),
    findByReference: jest.fn(),
    reverse: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: 1,
      email: 'john@test.com',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<TransactionsController>(
      TransactionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  /* =====================================================
     GET SUMMARY
  ===================================================== */

  describe('getSummary', () => {
    it('should call TransactionsService.getSummary with user ID', async () => {
      const expectedResult = {
        totalTransactions: 10,
      };

      mockTransactionsService.getSummary.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getSummary(mockRequest);

      expect(
        mockTransactionsService.getSummary,
      ).toHaveBeenCalledWith(1);

      expect(result).toEqual(expectedResult);
    });
  });

  /* =====================================================
     GET RECENT TRANSACTIONS
  ===================================================== */

  describe('getRecentTransactions', () => {
    it('should use default limit of 5 when no limit is provided', async () => {
      mockTransactionsService.getRecentTransactions.mockResolvedValue([]);

      await controller.getRecentTransactions(mockRequest);

      expect(
        mockTransactionsService.getRecentTransactions,
      ).toHaveBeenCalledWith(1, 5);
    });

    it('should use the provided valid limit', async () => {
      mockTransactionsService.getRecentTransactions.mockResolvedValue([]);

      await controller.getRecentTransactions(mockRequest, '10');

      expect(
        mockTransactionsService.getRecentTransactions,
      ).toHaveBeenCalledWith(1, 10);
    });

    it('should throw BadRequestException for limit less than 1', async () => {
      await expect(
        controller.getRecentTransactions(mockRequest, '0'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for limit greater than 20', async () => {
      await expect(
        controller.getRecentTransactions(mockRequest, '21'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid limit', async () => {
      await expect(
        controller.getRecentTransactions(mockRequest, 'invalid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for decimal limit', async () => {
      await expect(
        controller.getRecentTransactions(mockRequest, '5.5'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /* =====================================================
     GET ANALYTICS
  ===================================================== */

  describe('getAnalytics', () => {
    it('should use default 30 days when no days value is provided', async () => {
      mockTransactionsService.getAnalytics.mockResolvedValue({});

      await controller.getAnalytics(mockRequest);

      expect(
        mockTransactionsService.getAnalytics,
      ).toHaveBeenCalledWith(1, 30);
    });

    it('should use the provided valid days value', async () => {
      mockTransactionsService.getAnalytics.mockResolvedValue({});

      await controller.getAnalytics(mockRequest, '90');

      expect(
        mockTransactionsService.getAnalytics,
      ).toHaveBeenCalledWith(1, 90);
    });

    it('should throw BadRequestException for days less than 1', async () => {
      await expect(
        controller.getAnalytics(mockRequest, '0'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for days greater than 365', async () => {
      await expect(
        controller.getAnalytics(mockRequest, '366'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid days', async () => {
      await expect(
        controller.getAnalytics(mockRequest, 'invalid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for decimal days', async () => {
      await expect(
        controller.getAnalytics(mockRequest, '30.5'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /* =====================================================
     GET ALL TRANSACTIONS
  ===================================================== */

  describe('findAll', () => {
    it('should use default pagination values', async () => {
      mockTransactionsService.findAll.mockResolvedValue({
        data: [],
        total: 0,
      });

      await controller.findAll(mockRequest);

      expect(
        mockTransactionsService.findAll,
      ).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          page: 1,
          limit: 10,
          type: undefined,
          status: undefined,
          currency: undefined,
          search: undefined,
          startDate: undefined,
          endDate: undefined,
        }),
      );
    });

    it('should use valid pagination values', async () => {
      mockTransactionsService.findAll.mockResolvedValue({
        data: [],
        total: 0,
      });

      await controller.findAll(
        mockRequest,
        '2',
        '50',
      );

      expect(
        mockTransactionsService.findAll,
      ).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          page: 2,
          limit: 50,
        }),
      );
    });

    it('should throw BadRequestException for page less than 1', async () => {
      await expect(
        controller.findAll(
          mockRequest,
          '0',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid page', async () => {
      await expect(
        controller.findAll(
          mockRequest,
          'invalid',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for decimal page', async () => {
      await expect(
        controller.findAll(
          mockRequest,
          '1.5',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for limit less than 1', async () => {
      await expect(
        controller.findAll(
          mockRequest,
          undefined,
          '0',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for limit greater than 100', async () => {
      await expect(
        controller.findAll(
          mockRequest,
          undefined,
          '101',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid limit', async () => {
      await expect(
        controller.findAll(
          mockRequest,
          undefined,
          'invalid',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid transaction type', async () => {
      mockTransactionsService.findAll.mockResolvedValue({
        data: [],
      });

      await controller.findAll(
        mockRequest,
        undefined,
        undefined,
        'DEPOSIT',
      );

      expect(
        mockTransactionsService.findAll,
      ).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          type: 'DEPOSIT',
        }),
      );
    });

    it('should reject invalid transaction type', async () => {
      await expect(
        controller.findAll(
          mockRequest,
          undefined,
          undefined,
          'INVALID',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid transaction status', async () => {
      mockTransactionsService.findAll.mockResolvedValue({
        data: [],
      });

      await controller.findAll(
        mockRequest,
        undefined,
        undefined,
        undefined,
        'COMPLETED',
      );

      expect(
        mockTransactionsService.findAll,
      ).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'COMPLETED',
        }),
      );
    });

    it('should reject invalid transaction status', async () => {
      await expect(
        controller.findAll(
          mockRequest,
          undefined,
          undefined,
          undefined,
          'INVALID',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid currency', async () => {
      mockTransactionsService.findAll.mockResolvedValue({
        data: [],
      });

      await controller.findAll(
        mockRequest,
        undefined,
        undefined,
        undefined,
        undefined,
        'USD',
      );

      expect(
        mockTransactionsService.findAll,
      ).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          currency: 'USD',
        }),
      );
    });

    it('should reject invalid currency', async () => {
      await expect(
        controller.findAll(
          mockRequest,
          undefined,
          undefined,
          undefined,
          undefined,
          'INVALID',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should trim search text', async () => {
      mockTransactionsService.findAll.mockResolvedValue({
        data: [],
      });

      await controller.findAll(
        mockRequest,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '  TXN-123  ',
      );

      expect(
        mockTransactionsService.findAll,
      ).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          search: 'TXN-123',
        }),
      );
    });

    it('should convert empty search to undefined', async () => {
      mockTransactionsService.findAll.mockResolvedValue({
        data: [],
      });

      await controller.findAll(
        mockRequest,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '   ',
      );

      expect(
        mockTransactionsService.findAll,
      ).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          search: undefined,
        }),
      );
    });

    it('should parse valid start date', async () => {
      mockTransactionsService.findAll.mockResolvedValue({
        data: [],
      });

      await controller.findAll(
        mockRequest,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '2026-01-01',
      );

      const callArguments =
        mockTransactionsService.findAll.mock.calls[0];

      expect(callArguments[0]).toBe(1);

      expect(callArguments[1].startDate).toBeInstanceOf(Date);
    });

    it('should parse valid end date', async () => {
      mockTransactionsService.findAll.mockResolvedValue({
        data: [],
      });

      await controller.findAll(
        mockRequest,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '2026-01-31',
      );

      const callArguments =
        mockTransactionsService.findAll.mock.calls[0];

      expect(callArguments[1].endDate).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException for invalid start date', async () => {
      await expect(
        controller.findAll(
          mockRequest,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'invalid-date',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid end date', async () => {
      await expect(
        controller.findAll(
          mockRequest,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'invalid-date',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when end date is before start date', async () => {
      await expect(
        controller.findAll(
          mockRequest,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          '2026-02-01',
          '2026-01-01',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when date range exceeds one year', async () => {
      await expect(
        controller.findAll(
          mockRequest,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          '2024-01-01',
          '2026-01-01',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /* =====================================================
     FIND BY REFERENCE
  ===================================================== */

  describe('findByReference', () => {
    it('should call service with user ID and trimmed reference', async () => {
      const transaction = {
        id: 1,
        reference: 'TXN-123',
      };

      mockTransactionsService.findByReference.mockResolvedValue(
        transaction,
      );

      const result = await controller.findByReference(
        mockRequest,
        '  TXN-123  ',
      );

      expect(
        mockTransactionsService.findByReference,
      ).toHaveBeenCalledWith(
        1,
        'TXN-123',
      );

      expect(result).toEqual(transaction);
    });
  });

  /* =====================================================
     REVERSE TRANSACTION
  ===================================================== */

  describe('reverse', () => {
    it('should call service with user ID and transaction ID', async () => {
      const reversedTransaction = {
        id: 1,
        status: 'REVERSED',
      };

      mockTransactionsService.reverse.mockResolvedValue(
        reversedTransaction,
      );

      const result = await controller.reverse(
        mockRequest,
        1,
      );

      expect(
        mockTransactionsService.reverse,
      ).toHaveBeenCalledWith(
        1,
        1,
      );

      expect(result).toEqual(reversedTransaction);
    });
  });

  /* =====================================================
     FIND ONE TRANSACTION
  ===================================================== */

  describe('findOne', () => {
    it('should call service with user ID and transaction ID', async () => {
      const transaction = {
        id: 1,
        reference: 'TXN-123',
      };

      mockTransactionsService.findOne.mockResolvedValue(
        transaction,
      );

      const result = await controller.findOne(
        mockRequest,
        1,
      );

      expect(
        mockTransactionsService.findOne,
      ).toHaveBeenCalledWith(
        1,
        1,
      );

      expect(result).toEqual(transaction);
    });
  });
});