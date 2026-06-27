import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthGuard } from '@nestjs/passport';

/**
 * AuthController — 认证模块控制器
 *
 * 8 个端点覆盖完整认证生命周期:
 * register / verify-email / login / refresh / logout /
 * forgot-password / reset-password / change-password
 */
@ApiTags('Auth — 认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户注册
   * POST /api/v1/auth/register
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: '用户注册', description: '邮箱 + 密码 + 用户名注册，发送验证邮件' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 409, description: '邮箱或用户名冲突' })
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return { code: 0, message: '注册成功，验证邮件已发送', data };
  }

  /**
   * 邮箱验证
   * POST /api/v1/auth/verify-email
   */
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证邮箱', description: '使用邮件中的 Token 验证邮箱并激活账号' })
  @ApiResponse({ status: 200, description: '验证成功（返回 JWT）' })
  @ApiResponse({ status: 400, description: 'Token 无效或过期' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const data = await this.authService.verifyEmail(dto.token);
    return { code: 0, message: '邮箱验证成功', data };
  }

  /**
   * 用户登录
   * POST /api/v1/auth/login
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录', description: '邮箱 + 密码登录，返回 JWT 双 Token' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '凭证无效/未验证/已冻结' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const data = await this.authService.login(dto, ip);

    // 设置 Refresh Token HttpOnly Cookie
    const rememberMe = dto.remember_me ?? false;
    const maxAge = rememberMe ? 30 * 24 * 3600 * 1000 : 7 * 24 * 3600 * 1000;
    res.cookie('refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
      path: '/api/v1/auth',
    });

    return { code: 0, message: '登录成功', data };
  }

  /**
   * 刷新 Token
   * POST /api/v1/auth/refresh
   */
  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新 Access Token', description: '使用 Cookie 中的 Refresh Token 获取新 Access Token' })
  @ApiResponse({ status: 200, description: '刷新成功' })
  @ApiResponse({ status: 401, description: 'Refresh Token 无效或已撤销' })
  async refresh(@Req() req: any) {
    const data = await this.authService.refreshToken(req.user);
    return { code: 0, message: 'Token 刷新成功', data };
  }

  /**
   * 登出
   * POST /api/v1/auth/logout
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '登出', description: '撤销当前用户的 Refresh Token' })
  @ApiResponse({ status: 200, description: '登出成功' })
  async logout(
    @CurrentUser('sub') userId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);

    // 清除 Refresh Token Cookie
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });

    return { code: 0, message: '登出成功', data: null };
  }

  /**
   * 忘记密码
   * POST /api/v1/auth/forgot-password
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '忘记密码', description: '发送密码重置邮件（防邮箱枚举攻击）' })
  @ApiResponse({ status: 200, description: '邮件已发送（无论邮箱是否存在）' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { code: 0, message: '密码重置邮件已发送（如邮箱存在）', data: null };
  }

  /**
   * 重置密码
   * POST /api/v1/auth/reset-password
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重置密码', description: '使用重置邮件中的 Token 设置新密码' })
  @ApiResponse({ status: 200, description: '重置成功' })
  @ApiResponse({ status: 400, description: 'Token 无效或过期' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { code: 0, message: '密码重置成功', data: null };
  }

  /**
   * 修改密码（已登录）
   * POST /api/v1/auth/change-password
   */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '修改密码', description: '已登录用户修改密码，修改后需重新登录' })
  @ApiResponse({ status: 200, description: '修改成功' })
  @ApiResponse({ status: 401, description: '当前密码错误' })
  async changePassword(
    @CurrentUser('sub') userId: number,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.changePassword(userId, dto.old_password, dto.new_password);

    // 修改密码后清除 Refresh Token Cookie
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });

    return { code: 0, message: '密码修改成功，请重新登录', data: null };
  }
}
