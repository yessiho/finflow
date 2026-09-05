import { Test, TestingModule } from '@nestjs/testing';
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        email: 'john@test.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const expectedResult = {
        id: 1,
        email: 'john@test.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'ACTIVE',
      };

      mockUsersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createUserDto);

      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const expectedResult = [
        {
          id: 1,
          email: 'john@test.com',
          firstName: 'John',
          lastName: 'Doe',
          status: 'ACTIVE',
        },
        {
          id: 2,
          email: 'jane@test.com',
          firstName: 'Jane',
          lastName: 'Doe',
          status: 'ACTIVE',
        },
      ];

      mockUsersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(mockUsersService.findAll).toHaveBeenCalledTimes(1);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('getProfile', () => {
    it('should return the authenticated user from the request', () => {
      const mockUser = {
        id: 1,
        email: 'john@test.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockRequest = {
        user: mockUser,
      };

      const result = controller.getProfile(mockRequest as any);

      expect(result).toEqual(mockUser);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const expectedResult = {
        id: 1,
        email: 'john@test.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'ACTIVE',
      };

      mockUsersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(1);

      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);

      expect(result).toEqual(expectedResult);
    });
  });
});