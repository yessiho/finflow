import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';

@Injectable()
export class AdminsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAdminDto: CreateAdminDto) {
    const { email, password, firstName, lastName } = createAdminDto;

    const existingAdmin = await this.prisma.client.orm.public.Admin.first({
      email,
    });

    if (existingAdmin) {
      throw new ConflictException('Admin email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await this.prisma.client.orm.public.Admin.create({
      email,
      passwordHash,
      firstName,
      lastName,
    });

    return this.toPublicAdmin(admin);
  }

  async findAll() {
    const admins = await this.prisma.client.orm.public.Admin.all();

    return admins.map((admin) => this.toPublicAdmin(admin));
  }

  async findOne(id: number) {
    const admin = await this.prisma.client.orm.public.Admin.first({
      id,
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return this.toPublicAdmin(admin);
  }

  async findByEmail(email: string) {
    return this.prisma.client.orm.public.Admin.first({
      email,
    });
  }

  private toPublicAdmin(admin: any) {
    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      status: admin.status,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }
}