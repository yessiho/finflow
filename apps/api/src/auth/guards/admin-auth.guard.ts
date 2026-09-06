import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const user = request.user as { type?: string };

    if (!user || user.type !== 'ADMIN') {
      throw new UnauthorizedException('Admin access required');
    }

    return true;
  }
}