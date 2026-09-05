import {
  BadRequestException,
  ConflictException,
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
import { WalletsService } from './wallets.service.js';

describe('WalletsService', () => {
  let service: WalletsService;

  const mockPrismaService = {
    client: {
      orm: {
        public: {
          Wallet: {
            first: jest.fn(),
            all: jest.fn(),
            create: jest.fn(),
            where: jest.fn(),
          },
          Transaction: {
            create: jest.fn(),
          },
        },
      },
    },
  };

  const mockLedgerService = {
    postDeposit: jest.fn(),
    postWithdrawal: jest.fn(),
    postTransfer: jest.fn(),
  };

  const mockAuditService = {
    create: jest.fn(),
  };

  const mockWallet = {
    id: 1,
    userId: 1,
    currency: 'NGN',
    balance: 1000n,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
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

    service = module.get<WalletsService>(WalletsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /* =====================================================
     CREATE WALLET
  ===================================================== */

  describe('create', () => {
    it('should create a new wallet successfully', async () => {
      const newWallet = {
        id: 1,
        userId: 1,
        currency: 'NGN',
        balance: 0n,
        status: 'ACTIVE',
      };

      mockPrismaService.client.orm.public.Wallet.first.mockResolvedValue(null);

      mockPrismaService.client.orm.public.Wallet.create.mockResolvedValue(
        newWallet,
      );

      mockAuditService.create.mockResolvedValue(undefined);

      const result = await service.create(1, {
        currency: 'NGN',
      });

      expect(
        mockPrismaService.client.orm.public.Wallet.first,
      ).toHaveBeenCalledWith({
        userId: 1,
        currency: 'NGN',
      });

      expect(
        mockPrismaService.client.orm.public.Wallet.create,
      ).toHaveBeenCalledWith({
        userId: 1,
        currency: 'NGN',
        balance: 0n,
        status: 'ACTIVE',
      });

      expect(mockAuditService.create).toHaveBeenCalled();

      expect(result).toEqual({
        ...newWallet,
        balance: '0',
      });
    });

    it('should throw ConflictException if wallet already exists', async () => {
      mockPrismaService.client.orm.public.Wallet.first.mockResolvedValue(
        mockWallet,
      );

      await expect(
        service.create(1, {
          currency: 'NGN',
        }),
      ).rejects.toThrow(ConflictException);

      expect(
        mockPrismaService.client.orm.public.Wallet.create,
      ).not.toHaveBeenCalled();
    });
  });

  /* =====================================================
     FIND MY WALLETS
  ===================================================== */

  describe('findMyWallets', () => {
    it('should return only wallets belonging to the user', async () => {
      const wallets = [
        {
          ...mockWallet,
          id: 1,
          userId: 1,
          balance: 1000n,
        },
        {
          ...mockWallet,
          id: 2,
          userId: 2,
          balance: 5000n,
        },
        {
          ...mockWallet,
          id: 3,
          userId: 1,
          balance: 2000n,
        },
      ];

      mockPrismaService.client.orm.public.Wallet.all.mockResolvedValue(wallets);

      const result = await service.findMyWallets(1);

      expect(result).toHaveLength(2);

      expect(result).toEqual([
        {
          ...wallets[0],
          balance: '1000',
        },
        {
          ...wallets[2],
          balance: '2000',
        },
      ]);
    });
  });

  /* =====================================================
     DEPOSIT
  ===================================================== */

  describe('deposit', () => {
    it('should deposit money successfully', async () => {
      const updatedWallet = {
        ...mockWallet,
        balance: 1500n,
      };

      const mockTransaction = {
        id: 10,
        amount: 500n,
        currency: 'NGN',
        destinationWalletId: 1,
        reference: 'DEP-12345',
        status: 'COMPLETED',
        type: 'DEPOSIT',
      };

      mockPrismaService.client.orm.public.Wallet.first.mockResolvedValue(
        mockWallet,
      );

      mockPrismaService.client.orm.public.Wallet.where.mockReturnValue({
        update: jest.fn().mockResolvedValue(updatedWallet),
      });

      mockPrismaService.client.orm.public.Transaction.create.mockResolvedValue(
        mockTransaction,
      );

      mockLedgerService.postDeposit.mockResolvedValue(undefined);
      mockAuditService.create.mockResolvedValue(undefined);

      const result = await service.deposit(1, 1, {
        amount: '500',
      });

      expect(result.message).toBe('Deposit successful');

      expect(result.wallet.balance).toBe('1500');

      expect(result.transaction.amount).toBe('500');

      expect(mockLedgerService.postDeposit).toHaveBeenCalledWith(
        mockPrismaService.client,
        10,
        500n,
        'NGN',
      );

      expect(mockAuditService.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for zero deposit amount', async () => {
      await expect(
        service.deposit(1, 1, {
          amount: '0',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when wallet does not exist', async () => {
      mockPrismaService.client.orm.public.Wallet.first.mockResolvedValue(null);

      await expect(
        service.deposit(1, 1, {
          amount: '500',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject deposit when user does not own wallet', async () => {
      mockPrismaService.client.orm.public.Wallet.first.mockResolvedValue({
        ...mockWallet,
        userId: 2,
      });

      await expect(
        service.deposit(1, 1, {
          amount: '500',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject deposit when wallet is inactive', async () => {
      mockPrismaService.client.orm.public.Wallet.first.mockResolvedValue({
        ...mockWallet,
        status: 'INACTIVE',
      });

      await expect(
        service.deposit(1, 1, {
          amount: '500',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /* =====================================================
     WITHDRAW
  ===================================================== */

  describe('withdraw', () => {
    it('should withdraw money successfully', async () => {
      const updatedWallet = {
        ...mockWallet,
        balance: 500n,
      };

      const mockTransaction = {
        id: 11,
        amount: 500n,
        currency: 'NGN',
        sourceWalletId: 1,
        reference: 'WTH-12345',
        status: 'COMPLETED',
        type: 'WITHDRAWAL',
      };

      mockPrismaService.client.orm.public.Wallet.first.mockResolvedValue(
        mockWallet,
      );

      mockPrismaService.client.orm.public.Wallet.where.mockReturnValue({
        update: jest.fn().mockResolvedValue(updatedWallet),
      });

      mockPrismaService.client.orm.public.Transaction.create.mockResolvedValue(
        mockTransaction,
      );

      mockLedgerService.postWithdrawal.mockResolvedValue(undefined);
      mockAuditService.create.mockResolvedValue(undefined);

      const result = await service.withdraw(1, 1, {
        amount: '500',
      });

      expect(result.message).toBe('Withdrawal successful');

      expect(result.wallet.balance).toBe('500');

      expect(result.transaction.amount).toBe('500');

      expect(mockLedgerService.postWithdrawal).toHaveBeenCalledWith(
        mockPrismaService.client,
        11,
        500n,
        'NGN',
      );
    });

    it('should reject withdrawal with insufficient balance', async () => {
      mockPrismaService.client.orm.public.Wallet.first.mockResolvedValue(
        mockWallet,
      );

      await expect(
        service.withdraw(1, 1, {
          amount: '2000',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject withdrawal from inactive wallet', async () => {
      mockPrismaService.client.orm.public.Wallet.first.mockResolvedValue({
        ...mockWallet,
        status: 'INACTIVE',
      });

      await expect(
        service.withdraw(1, 1, {
          amount: '500',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject withdrawal from another users wallet', async () => {
      mockPrismaService.client.orm.public.Wallet.first.mockResolvedValue({
        ...mockWallet,
        userId: 2,
      });

      await expect(
        service.withdraw(1, 1, {
          amount: '500',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /* =====================================================
     TRANSFER
  ===================================================== */

  describe('transfer', () => {
    it('should transfer money successfully between wallets', async () => {
      const sourceWallet = {
        ...mockWallet,
        id: 1,
        userId: 1,
        balance: 1000n,
      };

      const destinationWallet = {
        ...mockWallet,
        id: 2,
        userId: 2,
        balance: 500n,
      };

      const updatedSourceWallet = {
        ...sourceWallet,
        balance: 700n,
      };

      const updatedDestinationWallet = {
        ...destinationWallet,
        balance: 800n,
      };

      const mockTransaction = {
        id: 12,
        amount: 300n,
        currency: 'NGN',
        sourceWalletId: 1,
        destinationWalletId: 2,
        reference: 'TRF-12345',
        status: 'COMPLETED',
        type: 'TRANSFER',
      };

      mockPrismaService.client.orm.public.Wallet.first
        .mockResolvedValueOnce(sourceWallet)
        .mockResolvedValueOnce(destinationWallet);

      mockPrismaService.client.orm.public.Wallet.where
        .mockReturnValueOnce({
          update: jest.fn().mockResolvedValue(updatedSourceWallet),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockResolvedValue(updatedDestinationWallet),
        });

      mockPrismaService.client.orm.public.Transaction.create.mockResolvedValue(
        mockTransaction,
      );

      mockLedgerService.postTransfer.mockResolvedValue(undefined);
      mockAuditService.create.mockResolvedValue(undefined);

      const result = await service.transfer(1, 1, {
        destinationWalletId: 2,
        amount: '300',
      });

      expect(result.message).toBe('Transfer successful');

      expect(result.amount).toBe('300');

      expect(result.sourceWallet.balance).toBe('700');

      expect(result.destinationWallet.balance).toBe('800');

      expect(mockLedgerService.postTransfer).toHaveBeenCalledWith(
        mockPrismaService.client,
        12,
        300n,
        'NGN',
      );
    });

    it('should reject transfer to the same wallet', async () => {
      await expect(
        service.transfer(1, 1, {
          destinationWalletId: 1,
          amount: '100',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transfer when source wallet does not exist', async () => {
      mockPrismaService.client.orm.public.Wallet.first.mockResolvedValue(null);

      await expect(
        service.transfer(1, 1, {
          destinationWalletId: 2,
          amount: '100',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject transfer with different currencies', async () => {
      const sourceWallet = {
        ...mockWallet,
        currency: 'NGN',
      };

      const destinationWallet = {
        ...mockWallet,
        id: 2,
        currency: 'USD',
      };

      mockPrismaService.client.orm.public.Wallet.first
        .mockResolvedValueOnce(sourceWallet)
        .mockResolvedValueOnce(destinationWallet);

      await expect(
        service.transfer(1, 1, {
          destinationWalletId: 2,
          amount: '100',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transfer with insufficient balance', async () => {
      const sourceWallet = {
        ...mockWallet,
        balance: 100n,
      };

      const destinationWallet = {
        ...mockWallet,
        id: 2,
        balance: 500n,
      };

      mockPrismaService.client.orm.public.Wallet.first
        .mockResolvedValueOnce(sourceWallet)
        .mockResolvedValueOnce(destinationWallet);

      await expect(
        service.transfer(1, 1, {
          destinationWalletId: 2,
          amount: '500',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});