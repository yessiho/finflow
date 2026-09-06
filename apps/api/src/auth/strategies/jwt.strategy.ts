import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';

interface JwtPayload {
  sub: number;
  email: string;
  type: 'USER' | 'ADMIN';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // =========================
    // USER TOKEN
    // =========================

    if (payload.type === 'USER') {
      const user = await this.prisma.client.orm.public.User.first({
        id: payload.sub,
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User is not authorized');
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        type: 'USER',
      };
    }

    // =========================
    // ADMIN TOKEN
    // =========================

    if (payload.type === 'ADMIN') {
      const admin = await this.prisma.client.orm.public.Admin.first({
        id: payload.sub,
      });

      if (!admin || admin.status !== 'ACTIVE') {
        throw new UnauthorizedException('Admin is not authorized');
      }

      return {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        status: admin.status,
        type: 'ADMIN',
      };
    }

    throw new UnauthorizedException('Invalid token');
  }
}