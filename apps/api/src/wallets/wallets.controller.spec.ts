import { Test, TestingModule } from '@nestjs/testing';
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { WalletsController } from './wallets.controller.js';
import { WalletsService } from './wallets.service.js';

describe('WalletsController', () => {
  let controller: WalletsController;

  const mockWalletsService = {
    create: jest.fn(),
    findMyWallets: jest.fn(),
    deposit: jest.fn(),
    withdraw: jest.fn(),
    transfer: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRequest = {
    user: {
      id: 1,
      email: 'john@test.com',
      firstName: 'John',
      lastName: 'Doe',
      status: 'ACTIVE',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [
        {
          provide: WalletsService,
          useValue: mockWalletsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<WalletsController>(WalletsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  /* =====================================================
     CREATE WALLET
  ===================================================== */

  describe('create', () => {
    it('should call WalletsService.create with authenticated user ID and DTO', async () => {
      const createWalletDto = {
        currency: 'NGN',
      };

      const expectedResult = {
        id: 1,
        userId: 1,
        currency: 'NGN',
        balance: '0',
        status: 'ACTIVE',
      };

      mockWalletsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(
        mockRequest as any,
        createWalletDto,
      );

      expect(mockWalletsService.create).toHaveBeenCalledWith(
        1,
        createWalletDto,
      );

      expect(result).toEqual(expectedResult);
    });
  });

  /* =====================================================
     FIND MY WALLETS
  ===================================================== */

  describe('findMyWallets', () => {
    it('should return wallets belonging to authenticated user', async () => {
      const expectedResult = [
        {
          id: 1,
          userId: 1,
          currency: 'NGN',
          balance: '1000',
          status: 'ACTIVE',
        },
        {
          id: 2,
          userId: 1,
          currency: 'USD',
          balance: '500',
          status: 'ACTIVE',
        },
      ];

      mockWalletsService.findMyWallets.mockResolvedValue(expectedResult);

      const result = await controller.findMyWallets(mockRequest as any);

      expect(mockWalletsService.findMyWallets).toHaveBeenCalledWith(1);

      expect(result).toEqual(expectedResult);
    });
  });

  /* =====================================================
     DEPOSIT
  ===================================================== */

  describe('deposit', () => {
    it('should call WalletsService.deposit correctly', async () => {
      const walletId = 1;

      const depositDto = {
        amount: '500',
      };

      const expectedResult = {
        message: 'Deposit successful',
      };

      mockWalletsService.deposit.mockResolvedValue(expectedResult);

      const result = await controller.deposit(
        mockRequest as any,
        walletId,
        depositDto,
      );

      expect(mockWalletsService.deposit).toHaveBeenCalledWith(
        1,
        walletId,
        depositDto,
      );

      expect(result).toEqual(expectedResult);
    });
  });

  /* =====================================================
     WITHDRAW
  ===================================================== */

  describe('withdraw', () => {
    it('should call WalletsService.withdraw correctly', async () => {
      const walletId = 1;

      const withdrawDto = {
        amount: '300',
      };

      const expectedResult = {
        message: 'Withdrawal successful',
      };

      mockWalletsService.withdraw.mockResolvedValue(expectedResult);

      const result = await controller.withdraw(
        mockRequest as any,
        walletId,
        withdrawDto,
      );

      expect(mockWalletsService.withdraw).toHaveBeenCalledWith(
        1,
        walletId,
        withdrawDto,
      );

      expect(result).toEqual(expectedResult);
    });
  });

  /* =====================================================
     TRANSFER
  ===================================================== */

  describe('transfer', () => {
    it('should call WalletsService.transfer correctly', async () => {
      const sourceWalletId = 1;

      const transferDto = {
        destinationWalletId: 2,
        amount: '250',
      };

      const expectedResult = {
        message: 'Transfer successful',
      };

      mockWalletsService.transfer.mockResolvedValue(expectedResult);

      const result = await controller.transfer(
        mockRequest as any,
        sourceWalletId,
        transferDto,
      );

      expect(mockWalletsService.transfer).toHaveBeenCalledWith(
        1,
        sourceWalletId,
        transferDto,
      );

      expect(result).toEqual(expectedResult);
    });
  });

  /* =====================================================
     USER ID FALLBACK
  ===================================================== */

  describe('authenticated user ID handling', () => {
    it('should use userId when id is not available', async () => {
      const requestWithUserId = {
        user: {
          userId: 99,
          email: 'jane@test.com',
        },
      };

      mockWalletsService.findMyWallets.mockResolvedValue([]);

      await controller.findMyWallets(requestWithUserId as any);

      expect(mockWalletsService.findMyWallets).toHaveBeenCalledWith(99);
    });

    it('should throw an error when authenticated user ID is missing', () => {
      const invalidRequest = {
        user: {
          email: 'unknown@test.com',
        },
      };

      expect(() =>
        controller.findMyWallets(invalidRequest as any),
      ).toThrow('Authenticated user ID is missing');
    });
  });
});