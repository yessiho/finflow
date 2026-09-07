import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service.js';

import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /*
   * ==========================================
   * CREATE USER
   * ==========================================
   */
  async create(createUserDto: CreateUserDto) {
    const { email, password, firstName, lastName } = createUserDto;

    const existingUser =
      await this.prisma.client.orm.public.User.first({
        email,
      });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user =
      await this.prisma.client.orm.public.User.create({
        email,
        passwordHash,
        firstName,
        lastName,
      });

    return this.toPublicUser(user);
  }

  /*
   * ==========================================
   * GET ALL USERS
   * ==========================================
   */
  async findAll() {
    const users =
      await this.prisma.client.orm.public.User.all();

    return users.map((user) =>
      this.toPublicUser(user),
    );
  }

  /*
   * ==========================================
   * GET USER BY ID
   * ==========================================
   */
  async findOne(id: number) {
    const user =
      await this.prisma.client.orm.public.User.first({
        id,
      });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicUser(user);
  }

  /*
   * ==========================================
   * GET AUTHENTICATED USER PROFILE
   * ==========================================
   */
  async getProfile(userId: number) {
    const user =
      await this.prisma.client.orm.public.User.first({
        id: userId,
      });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicUser(user);
  }

  /*
   * ==========================================
   * UPDATE USER PROFILE
   *
   * Users can only update their own profile.
   * ==========================================
   */
  async updateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ) {
    const user =
      await this.prisma.client.orm.public.User.first({
        id: userId,
      });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: {
      firstName?: string;
      lastName?: string;
    } = {};

    if (updateProfileDto.firstName !== undefined) {
      updateData.firstName =
        updateProfileDto.firstName.trim();
    }

    if (updateProfileDto.lastName !== undefined) {
      updateData.lastName =
        updateProfileDto.lastName.trim();
    }

    /*
     * Prevent empty update requests.
     */
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException(
        'No profile changes were provided',
      );
    }

    const updatedUser =
      await this.prisma.client.orm.public.User.where({
        id: userId,
      }).update(updateData);

    return this.toPublicUser(updatedUser);
  }

  /*
   * ==========================================
   * CHANGE PASSWORD
   *
   * Requires current password confirmation.
   * ==========================================
   */
  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ) {
    const user =
      await this.prisma.client.orm.public.User.first({
        id: userId,
      });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    /*
     * Verify current password.
     */
    const passwordMatches =
      await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.passwordHash,
      );

    if (!passwordMatches) {
      throw new BadRequestException(
        'Current password is incorrect',
      );
    }

    /*
     * Prevent reusing the same password.
     */
    const samePassword =
      await bcrypt.compare(
        changePasswordDto.newPassword,
        user.passwordHash,
      );

    if (samePassword) {
      throw new BadRequestException(
        'New password must be different from your current password',
      );
    }

    /*
     * Hash the new password.
     */
    const passwordHash =
      await bcrypt.hash(
        changePasswordDto.newPassword,
        12,
      );

    /*
     * Update the authenticated user's password.
     *
     * Important:
     * Your Prisma ORM runtime uses:
     *
     * Model.where(...).update(...)
     *
     * NOT:
     *
     * Model.update({
     *   where: {},
     *   data: {}
     * })
     */
    await this.prisma.client.orm.public.User.where({
      id: userId,
    }).update({
      passwordHash,
    });

    return {
      message: 'Password changed successfully',
    };
  }

  /*
   * ==========================================
   * FIND USER BY EMAIL
   * ==========================================
   */
  async findByEmail(email: string) {
    return this.prisma.client.orm.public.User.first({
      email,
    });
  }

  /*
   * ==========================================
   * CONVERT USER TO PUBLIC RESPONSE
   *
   * Never expose passwordHash.
   * ==========================================
   */
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