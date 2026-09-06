import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // =========================
  // USER LOGIN
  // =========================

  async userLogin(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.client.orm.public.User.first({
      email,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      type: 'USER',
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
      },
    };
  }

  // =========================
  // ADMIN REGISTER
  // =========================

  async adminRegister(createAdminDto: CreateAdminDto) {
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

    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      status: admin.status,
      createdAt: admin.createdAt,
    };
  }

  // =========================
  // ADMIN LOGIN
  // =========================

  async adminLogin(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const admin = await this.prisma.client.orm.public.Admin.first({
      email,
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (admin.status !== 'ACTIVE') {
      throw new UnauthorizedException('Admin account is not active');
    }

    const passwordMatches = await bcrypt.compare(
      password,
      admin.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: admin.id,
      email: admin.email,
      type: 'ADMIN',
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        status: admin.status,
      },
    };
  }
}