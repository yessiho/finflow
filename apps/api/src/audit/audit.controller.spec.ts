import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AuditService } from './audit.service.js';
import { AuditController } from './audit.controller.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

describe('AuditController', () => {
  let controller: AuditController;

  const mockAuditService = {
    findAll: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AuditController>(AuditController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call AuditService.findAll with default values', async () => {
      const mockResult = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockAuditService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll();

      expect(mockAuditService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        action: undefined,
        entity: undefined,
        userId: undefined,
      });

      expect(result).toEqual(mockResult);
    });

    it('should parse page and limit correctly', async () => {
      mockAuditService.findAll.mockResolvedValue({});

      await controller.findAll('2', '50');

      expect(mockAuditService.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 50,
        action: undefined,
        entity: undefined,
        userId: undefined,
      });
    });

    it('should parse user ID correctly', async () => {
      mockAuditService.findAll.mockResolvedValue({});

      await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        '5',
      );

      expect(mockAuditService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        action: undefined,
        entity: undefined,
        userId: 5,
      });
    });

    it('should trim action and entity values', async () => {
      mockAuditService.findAll.mockResolvedValue({});

      await controller.findAll(
        undefined,
        undefined,
        '  DEPOSIT_COMPLETED  ',
        '  TRANSACTION  ',
      );

      expect(mockAuditService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        action: 'DEPOSIT_COMPLETED',
        entity: 'TRANSACTION',
        userId: undefined,
      });
    });

    it('should convert empty action and entity strings to undefined', async () => {
      mockAuditService.findAll.mockResolvedValue({});

      await controller.findAll(
        undefined,
        undefined,
        '   ',
        '   ',
      );

      expect(mockAuditService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        action: undefined,
        entity: undefined,
        userId: undefined,
      });
    });

    it('should reject page less than 1', async () => {
      await expect(controller.findAll('0')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockAuditService.findAll).not.toHaveBeenCalled();
    });

    it('should reject negative page', async () => {
      await expect(controller.findAll('-1')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockAuditService.findAll).not.toHaveBeenCalled();
    });

    it('should reject non-integer page', async () => {
      await expect(controller.findAll('1.5')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockAuditService.findAll).not.toHaveBeenCalled();
    });

    it('should reject invalid page string', async () => {
      await expect(controller.findAll('abc')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockAuditService.findAll).not.toHaveBeenCalled();
    });

    it('should reject limit less than 1', async () => {
      await expect(
        controller.findAll(undefined, '0'),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuditService.findAll).not.toHaveBeenCalled();
    });

    it('should reject limit greater than 100', async () => {
      await expect(
        controller.findAll(undefined, '101'),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuditService.findAll).not.toHaveBeenCalled();
    });

    it('should reject non-integer limit', async () => {
      await expect(
        controller.findAll(undefined, '10.5'),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuditService.findAll).not.toHaveBeenCalled();
    });

    it('should reject invalid limit string', async () => {
      await expect(
        controller.findAll(undefined, 'invalid'),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuditService.findAll).not.toHaveBeenCalled();
    });

    it('should reject user ID less than 1', async () => {
      await expect(
        controller.findAll(
          undefined,
          undefined,
          undefined,
          undefined,
          '0',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuditService.findAll).not.toHaveBeenCalled();
    });

    it('should reject negative user ID', async () => {
      await expect(
        controller.findAll(
          undefined,
          undefined,
          undefined,
          undefined,
          '-5',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuditService.findAll).not.toHaveBeenCalled();
    });

    it('should reject non-integer user ID', async () => {
      await expect(
        controller.findAll(
          undefined,
          undefined,
          undefined,
          undefined,
          '1.5',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuditService.findAll).not.toHaveBeenCalled();
    });

    it('should reject invalid user ID string', async () => {
      await expect(
        controller.findAll(
          undefined,
          undefined,
          undefined,
          undefined,
          'abc',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuditService.findAll).not.toHaveBeenCalled();
    });

    it('should pass all filters correctly', async () => {
      const mockResult = {
        data: [],
        pagination: {
          page: 2,
          limit: 50,
          total: 0,
          totalPages: 0,
        },
      };

      mockAuditService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(
        '2',
        '50',
        'TRANSFER_COMPLETED',
        'TRANSACTION',
        '10',
      );

      expect(mockAuditService.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 50,
        action: 'TRANSFER_COMPLETED',
        entity: 'TRANSACTION',
        userId: 10,
      });

      expect(result).toEqual(mockResult);
    });
  });
});