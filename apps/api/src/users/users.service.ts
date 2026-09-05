import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, firstName, lastName } = createUserDto;

    const existingUser = await this.prisma.client.orm.public.User.first({
      email,
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.client.orm.public.User.create({
      email,
      passwordHash,
      firstName,
      lastName,
    });

    return this.toPublicUser(user);
  }

  async findAll() {
    const users = await this.prisma.client.orm.public.User.all();

    return users.map((user) => this.toPublicUser(user));
  }

  async findOne(id: number) {
    const user = await this.prisma.client.orm.public.User.first({
      id,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicUser(user);
  }

  async findByEmail(email: string) {
    return this.prisma.client.orm.public.User.first({
      email,
    });
  }

  private toPublicUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
