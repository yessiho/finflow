import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { PrismaService } from '../prisma/prisma.service.js';

/* =====================================================
   MOCK BCRYPT BEFORE IMPORTING AUTHSERVICE
===================================================== */

const mockBcryptCompare = jest.fn();

jest.unstable_mockModule('bcrypt', () => ({
  compare: mockBcryptCompare,
}));

/* =====================================================
   DYNAMICALLY IMPORT AUTH SERVICE
===================================================== */

const { AuthService } = await import('./auth.service.js');

describe('AuthService', () => {
  let service: InstanceType<typeof AuthService>;

  const mockPrismaService = {
    client: {
      orm: {
        public: {
          User: {
            first: jest.fn(),
          },
        },
      },
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockUser = {
    id: 1,
    email: 'john@test.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should successfully login a user and return an access token', async () => {
      mockPrismaService.client.orm.public.User.first.mockResolvedValue(mockUser);

      mockBcryptCompare.mockResolvedValue(true);

      mockJwtService.signAsync.mockResolvedValue('mock-access-token');

      const result = await service.login('john@test.com', 'Password123');

      expect(
        mockPrismaService.client.orm.public.User.first,
      ).toHaveBeenCalledWith({
        email: 'john@test.com',
      });

      expect(mockBcryptCompare).toHaveBeenCalledWith(
        'Password123',
        'hashed-password',
      );

      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });

      expect(result).toEqual({
        access_token: 'mock-access-token',
        user: {
          id: 1,
          email: 'john@test.com',
          firstName: 'John',
          lastName: 'Doe',
          status: 'ACTIVE',
        },
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockPrismaService.client.orm.public.User.first.mockResolvedValue(null);

      await expect(
        service.login('unknown@test.com', 'Password123'),
      ).rejects.toThrow(UnauthorizedException);

      expect(
        mockPrismaService.client.orm.public.User.first,
      ).toHaveBeenCalledWith({
        email: 'unknown@test.com',
      });

      expect(mockBcryptCompare).not.toHaveBeenCalled();

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      mockPrismaService.client.orm.public.User.first.mockResolvedValue(mockUser);

      mockBcryptCompare.mockResolvedValue(false);

      await expect(
        service.login('john@test.com', 'WrongPassword'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockBcryptCompare).toHaveBeenCalledWith(
        'WrongPassword',
        'hashed-password',
      );

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});