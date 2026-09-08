import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { AuthService } from './auth.service.js';

import { CreateAdminDto } from './dto/create-admin.dto.js';
import { LoginDto } from './dto/login.dto.js';

import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { UsersService } from '../users/users.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // ============================================================
  // USER REGISTER
  // ============================================================

  @Post('user/register')
  userRegister(
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.create(createUserDto);
  }

  // ============================================================
  // USER LOGIN
  // ============================================================

  @Post('user/login')
  userLogin(
    @Body() loginDto: LoginDto,
  ) {
    return this.authService.userLogin(loginDto);
  }

  // ============================================================
  // USER FORGOT PASSWORD
  // ============================================================

  @Post('user/forgot-password')
  forgotPassword(
    @Body('email') email: string,
  ) {
    return this.authService.forgotPassword(email);
  }

  // ============================================================
  // USER RESET PASSWORD
  // ============================================================

  @Post('user/reset-password')
  resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
    @Body('confirmPassword') confirmPassword: string,
  ) {
    return this.authService.resetPassword(
      token,
      newPassword,
      confirmPassword,
    );
  }

  // ============================================================
  // ADMIN REGISTER
  // ============================================================

  @Post('admin/register')
  adminRegister(
    @Body() createAdminDto: CreateAdminDto,
  ) {
    return this.authService.adminRegister(createAdminDto);
  }

  // ============================================================
  // ADMIN LOGIN
  // ============================================================

  @Post('admin/login')
  adminLogin(
    @Body() loginDto: LoginDto,
  ) {
    return this.authService.adminLogin(loginDto);
  }
}