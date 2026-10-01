import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { nowInstant } from '../prisma/temporal.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(createAdminDto: CreateAdminDto, performedByAdminId?: number) {
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
      updatedAt: nowInstant(),
    });

    if (performedByAdminId) {
      await this.auditService.create({
        userId: performedByAdminId,
        action: 'ADMIN_CREATED',
        entity: 'Admin',
        entityId: String(admin.id),
        metadata: JSON.stringify({
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
        }),
      });
    }

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

  async update(
    id: number,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
    },
    performedByAdminId?: number,
  ) {
    const admin = await this.prisma.client.orm.public.Admin.first({
      id,
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (data.email && data.email !== admin.email) {
      const existingAdmin =
        await this.prisma.client.orm.public.Admin.first({
          email: data.email,
        });

      if (existingAdmin && existingAdmin.id !== id) {
        throw new ConflictException('Admin email already exists');
      }
    }

    const updatedAdmin =
      await this.prisma.client.orm.public.Admin
        .where({ id })
        .update({
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.firstName !== undefined
            ? { firstName: data.firstName }
            : {}),
          ...(data.lastName !== undefined
            ? { lastName: data.lastName }
            : {}),
          updatedAt: nowInstant(),
        });

    if (performedByAdminId) {
      await this.auditService.create({
        userId: performedByAdminId,
        action: 'ADMIN_UPDATED',
        entity: 'Admin',
        entityId: String(id),
        metadata: JSON.stringify({
          changedFields: Object.keys(data),
        }),
      });
    }

    return this.toPublicAdmin(updatedAdmin);
  }

  async updateStatus(
    id: number,
    status: 'ACTIVE' | 'SUSPENDED',
    performedByAdminId: number,
  ) {
    const admin = await this.prisma.client.orm.public.Admin.first({
      id,
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.id === performedByAdminId && status === 'SUSPENDED') {
      throw new ForbiddenException(
        'You cannot suspend your own admin account',
      );
    }

    if (admin.status === status) {
      return this.toPublicAdmin(admin);
    }

    if (status === 'SUSPENDED') {
      const assignments =
        await this.prisma.client.orm.public.AdminRoleAssignment
          .where({
            adminId: id,
            isActive: true,
          })
          .all();

      for (const assignment of assignments) {
        const role =
          await this.prisma.client.orm.public.AdminRole.first({
            id: assignment.roleId,
          });

        if (role?.code !== 'SUPER_ADMIN') {
          continue;
        }

        const activeSuperAdmins =
          await this.prisma.client.orm.public.AdminRoleAssignment
            .where({
              roleId: assignment.roleId,
              isActive: true,
            })
            .all();

        const activeSuperAdminCount = activeSuperAdmins.filter(
          (item) => item.adminId !== id,
        ).length;

        if (activeSuperAdminCount === 0) {
          throw new ForbiddenException(
            'Cannot suspend the last active SUPER_ADMIN',
          );
        }
      }
    }

    const updatedAdmin =
      await this.prisma.client.orm.public.Admin
        .where({ id })
        .update({
          status,
          updatedAt: nowInstant(),
        });

    await this.auditService.create({
      userId: performedByAdminId,
      action:
        status === 'SUSPENDED'
          ? 'ADMIN_SUSPENDED'
          : 'ADMIN_REACTIVATED',
      entity: 'Admin',
      entityId: String(id),
      metadata: JSON.stringify({
        previousStatus: admin.status,
        newStatus: status,
      }),
    });

    return this.toPublicAdmin(updatedAdmin);
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