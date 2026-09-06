import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminsService } from './admins.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AdminsService', () => {
  let service: AdminsService;

  const prismaMock = {
    client: {
      orm: {
        public: {
          Admin: {
            first: jest.fn(),
            create: jest.fn(),
            all: jest.fn(),
          },
        },
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<AdminsService>(AdminsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});