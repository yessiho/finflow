import {
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

import { PrismaService } from '../prisma/prisma.service.js';

/* =====================================================
   MOCK BCRYPT BEFORE IMPORTING USERSSERVICE
===================================================== */

const mockBcryptHash = jest.fn();

jest.unstable_mockModule('bcrypt', () => ({
  hash: mockBcryptHash,
}));

/* =====================================================
   DYNAMICALLY IMPORT USERS SERVICE
===================================================== */

const { UsersService } = await import('./users.service.js');

describe('UsersService', () => {
  let service: InstanceType<typeof UsersService>;

  const mockPrismaService = {
    client: {
      orm: {
        public: {
          User: {
            first: jest.fn(),
            create: jest.fn(),
            all: jest.fn(),
          },
        },
      },
    },
  };

  const mockUser = {
    id: 1,
    email: 'john@test.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  /* =====================================================
     BASIC TEST
  ===================================================== */

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /* =====================================================
     CREATE USER
  ===================================================== */

  describe('create', () => {
    const createUserDto = {
      email: 'john@test.com',
      password: 'Password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should create a new user successfully', async () => {
      mockPrismaService.client.orm.public.User.first.mockResolvedValue(null);

      mockBcryptHash.mockResolvedValue('hashed-password');

      mockPrismaService.client.orm.public.User.create.mockResolvedValue(
        mockUser,
      );

      const result = await service.create(createUserDto);

      expect(
        mockPrismaService.client.orm.public.User.first,
      ).toHaveBeenCalledWith({
        email: createUserDto.email,
      });

      expect(mockBcryptHash).toHaveBeenCalledWith(
        createUserDto.password,
        12,
      );

      expect(
        mockPrismaService.client.orm.public.User.create,
      ).toHaveBeenCalledWith({
        email: createUserDto.email,
        passwordHash: 'hashed-password',
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
      });

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        status: mockUser.status,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrismaService.client.orm.public.User.first.mockResolvedValue(
        mockUser,
      );

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );

      expect(mockBcryptHash).not.toHaveBeenCalled();

      expect(
        mockPrismaService.client.orm.public.User.create,
      ).not.toHaveBeenCalled();
    });
  });

  /* =====================================================
     FIND ALL USERS
  ===================================================== */

  describe('findAll', () => {
    it('should return all users without password hashes', async () => {
      const secondUser = {
        ...mockUser,
        id: 2,
        email: 'jane@test.com',
        firstName: 'Jane',
      };

      mockPrismaService.client.orm.public.User.all.mockResolvedValue([
        mockUser,
        secondUser,
      ]);

      const result = await service.findAll();

      expect(
        mockPrismaService.client.orm.public.User.all,
      ).toHaveBeenCalled();

      expect(result).toEqual([
        {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          status: mockUser.status,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
        {
          id: secondUser.id,
          email: secondUser.email,
          firstName: secondUser.firstName,
          lastName: secondUser.lastName,
          status: secondUser.status,
          createdAt: secondUser.createdAt,
          updatedAt: secondUser.updatedAt,
        },
      ]);
    });
  });

  /* =====================================================
     FIND ONE USER
  ===================================================== */

  describe('findOne', () => {
    it('should return a user when found', async () => {
      mockPrismaService.client.orm.public.User.first.mockResolvedValue(
        mockUser,
      );

      const result = await service.findOne(1);

      expect(
        mockPrismaService.client.orm.public.User.first,
      ).toHaveBeenCalledWith({
        id: 1,
      });

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        status: mockUser.status,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.client.orm.public.User.first.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        NotFoundException,
      );

      expect(
        mockPrismaService.client.orm.public.User.first,
      ).toHaveBeenCalledWith({
        id: 999,
      });
    });
  });

  /* =====================================================
     FIND USER BY EMAIL
  ===================================================== */

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockPrismaService.client.orm.public.User.first.mockResolvedValue(
        mockUser,
      );

      const result = await service.findByEmail('john@test.com');

      expect(
        mockPrismaService.client.orm.public.User.first,
      ).toHaveBeenCalledWith({
        email: 'john@test.com',
      });

      expect(result).toEqual(mockUser);
    });

    it('should return null when email does not exist', async () => {
      mockPrismaService.client.orm.public.User.first.mockResolvedValue(null);

      const result = await service.findByEmail('unknown@test.com');

      expect(result).toBeNull();
    });
  });
});