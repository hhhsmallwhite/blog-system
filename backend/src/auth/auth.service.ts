import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

/** 登录失败最大次数 */
const MAX_LOGIN_ATTEMPTS = 5;
/** 登录锁定时长（分钟） */
const LOGIN_LOCK_MINUTES = 15;
/** 验证 Token 有效期（小时） */
const VERIFICATION_TOKEN_HOURS = 1;
/** 重置 Token 有效期（小时） */
const RESET_TOKEN_HOURS = 1;

/**
 * AuthService — 认证核心业务逻辑
 *
 * 负责用户注册、登录、Token 管理、密码重置等认证流程。
 * 依赖 PrismaService（数据库）、RedisService（限流）、
 * MailService（邮件）、JwtService（JWT 签发）。
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ===== 1. 注册 =====

  /**
   * 用户注册
   *
   * 流程:
   * 1. 校验邮箱和用户名唯一性（409 冲突）
   * 2. 密码哈希（bcrypt, 12 rounds）
   * 3. 创建用户（status=pending_verification）+ 分配 author 角色
   * 4. 生成邮箱验证 Token（24位 hex + UUID）
   * 5. 异步发送验证邮件
   */
  async register(dto: RegisterDto) {
    // 检查邮箱唯一
    const emailExists = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (emailExists) {
      throw new ConflictException({ code: 40901, message: '邮箱已被注册' });
    }

    // 检查用户名唯一
    const usernameExists = await this.prisma.user.findUnique({
      where: { username: dto.username },
      select: { id: true },
    });
    if (usernameExists) {
      throw new ConflictException({ code: 40902, message: '用户名已被占用' });
    }

    // 密码哈希
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // 查找 author 角色（默认注册用户为作者角色）
    const authorRole = await this.prisma.role.findUnique({
      where: { name: 'author' },
    });

    // 在事务中创建用户 + 分配角色 + 生成验证 Token
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          passwordHash,
        },
      });

      // 分配 author 角色
      if (authorRole) {
        await tx.userRole.create({
          data: { userId: newUser.id, roleId: authorRole.id },
        });
      }

      // 生成验证 Token
      const token = uuidv4().replace(/-/g, '') + Math.random().toString(36).slice(2, 10);
      await tx.verificationToken.create({
        data: {
          userId: newUser.id,
          token,
          type: 'email_verification',
          expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_HOURS * 3600 * 1000),
        },
      });

      return { newUser, token };
    });

    // 发送验证邮件（异步，不阻塞注册响应）
    this.mailService
      .sendVerificationEmail(user.newUser.email, user.token, user.newUser.username)
      .catch((err) => this.logger.error(`验证邮件发送失败: ${err.message}`));

    this.logger.log(`新用户注册: ${dto.email} (username=${dto.username})`);

    return {
      id: user.newUser.id,
      email: user.newUser.email,
      username: user.newUser.username,
      status: user.newUser.status,
      created_at: user.newUser.createdAt,
    };
  }

  // ===== 2. 邮箱验证 =====

  /**
   * 邮箱验证
   *
   * 流程:
   * 1. 查找未使用、未过期的验证 Token
   * 2. 标记 Token 已使用
   * 3. 激活用户（status: active）
   * 4. 返回 JWT 双 Token（免二次登录）
   */
  async verifyEmail(token: string) {
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token },
      include: { user: { include: { userRoles: { include: { role: true } } } } },
    });

    if (!verificationToken) {
      throw new BadRequestException({ code: 40001, message: '验证链接无效或已过期' });
    }

    if (verificationToken.isUsed) {
      throw new ConflictException({ code: 40903, message: '邮箱已验证，请直接登录' });
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException({ code: 40001, message: '验证链接已过期，请重新注册' });
    }

    if (verificationToken.type !== 'email_verification') {
      throw new BadRequestException({ code: 40001, message: '无效的 Token 类型' });
    }

    const user = verificationToken.user;

    // 事务：标记 Token 已用 + 激活用户
    await this.prisma.$transaction([
      this.prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { isUsed: true },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'active' },
      }),
    ]);

    // 生成 JWT 双 Token
    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokens = await this.generateTokens(user.id, user.email, user.username, roles);

    this.logger.log(`邮箱验证成功: ${user.email}`);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.accessExpiresIn,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        status: 'active',
        avatar: user.avatar,
        blog_name: user.blogName,
        bio: user.bio,
      },
    };
  }

  // ===== 3. 登录 =====

  /**
   * 用户登录
   *
   * 流程:
   * 1. Redis 检查登录失败次数（5 次/15 分钟锁定）
   * 2. 查找用户（email）
   * 3. 验证密码（bcrypt compare）
   * 4. 检查用户状态（active 才可登录）
   * 5. 生成 JWT 双 Token
   * 6. 更新 lastLoginAt/IP，清除登录失败计数
   */
  async login(dto: LoginDto, ip: string) {
    const emailLower = dto.email.toLowerCase();

    // 检查登录锁定
    const lockTTL = await this.redis.getLoginLockTTL(emailLower);
    if (lockTTL > 0) {
      const minutes = Math.ceil(lockTTL / 60);
      this.logger.warn(`登录锁定: ${emailLower} (剩余 ${minutes} 分钟)`);
      throw new UnauthorizedException({
        code: 42902,
        message: `登录失败次数过多，请 ${minutes} 分钟后重试`,
      });
    }

    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { email: emailLower },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || user.deletedAt) {
      await this.redis.recordLoginFailure(emailLower);
      throw new UnauthorizedException({ code: 40101, message: '邮箱或密码错误' });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.redis.recordLoginFailure(emailLower);
      throw new UnauthorizedException({ code: 40101, message: '邮箱或密码错误' });
    }

    // 检查状态
    if (user.status === 'pending_verification') {
      throw new UnauthorizedException({ code: 40102, message: '邮箱未验证，请先验证邮箱' });
    }
    if (user.status === 'suspended') {
      throw new UnauthorizedException({ code: 40103, message: '账号已被冻结' });
    }

    // 生成 Token
    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.username,
      roles,
      dto.remember_me,
    );

    // 更新登录信息
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    // 清除失败计数
    await this.redis.clearLoginAttempts(emailLower);

    this.logger.log(`用户登录成功: ${user.email} (ip=${ip})`);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.accessExpiresIn,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        status: user.status,
        avatar: user.avatar,
        blog_name: user.blogName,
        bio: user.bio,
        roles,
      },
    };
  }

  // ===== 4. Token 刷新 =====

  /**
   * 刷新 Access Token
   *
   * 使用 Refresh Token（来自 Cookie）发放新的 Access Token。
   * JwtRefreshStrategy 已完成了签名验证 + 撤销检查。
   */
  async refreshToken(userPayload: JwtPayload & { refreshToken: string }) {
    const accessTokenExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '2h');

    // 签发新的 Access Token
    const accessToken = this.jwtService.sign(
      {
        sub: userPayload.sub,
        email: userPayload.email,
        username: userPayload.username,
        roles: userPayload.roles,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTokenExpiresIn as any,
      } as any,
    );

    const expiresIn = this.parseExpiresIn(accessTokenExpiresIn);

    return {
      access_token: accessToken,
      expires_in: expiresIn,
    };
  }

  // ===== 5. 登出 =====

  /**
   * 用户登出
   *
   * 撤销用户的所有 Refresh Token（清除持久化登录）。
   * Access Token 在过期前仍有效（短期窗口可接受）。
   */
  async logout(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    this.logger.log(`用户登出: userId=${userId}`);
  }

  // ===== 6. 忘记密码 =====

  /**
   * 忘记密码 — 发送重置邮件
   *
   * 安全设计：无论邮箱是否存在都返回 200，防止邮箱枚举攻击。
   * 如果邮箱存在且状态正常，生成重置 Token 并发送邮件。
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, status: true },
    });

    // 安全：无论用户是否存在都返回成功
    if (!user || user.status === 'deleted') {
      this.logger.log(`忘记密码请求（用户不存在）: ${email}`);
      return;
    }

    // 生成重置 Token
    const token = uuidv4().replace(/-/g, '') + Math.random().toString(36).slice(2, 10);
    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + RESET_TOKEN_HOURS * 3600 * 1000),
      },
    });

    // 发送邮件
    this.mailService
      .sendPasswordResetEmail(user.email, token)
      .catch((err) => this.logger.error(`重置密码邮件发送失败: ${err.message}`));

    this.logger.log(`密码重置邮件已发送: ${user.email}`);
  }

  // ===== 7. 重置密码 =====

  /**
   * 重置密码
   *
   * 流程:
   * 1. 查找未使用、未过期的 password_reset Token
   * 2. 更新密码哈希
   * 3. 标记 Token 已使用
   * 4. 撤销该用户所有 Refresh Token（安全措施）
   */
  async resetPassword(token: string, newPassword: string) {
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      throw new BadRequestException({ code: 40002, message: '重置链接无效或已过期' });
    }

    if (verificationToken.isUsed) {
      throw new BadRequestException({ code: 40002, message: '重置链接已使用' });
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException({ code: 40002, message: '重置链接已过期，请重新发起' });
    }

    if (verificationToken.type !== 'password_reset') {
      throw new BadRequestException({ code: 40002, message: '无效的 Token 类型' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    // 事务：更新密码 + 标记 Token + 撤销所有 Refresh Token
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: { passwordHash, updatedAt: new Date() },
      }),
      this.prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { isUsed: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: verificationToken.userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    this.logger.log(`密码重置成功: userId=${verificationToken.userId}`);
  }

  // ===== 8. 修改密码 =====

  /**
   * 修改密码（已登录用户）
   *
   * 流程:
   * 1. 验证旧密码
   * 2. 更新为新密码
   * 3. 撤销所有 Refresh Token（需重新登录）
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException({ code: 40106, message: '用户不存在' });
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException({ code: 40106, message: '当前密码错误' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, updatedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    this.logger.log(`密码修改成功（需重新登录）: userId=${userId}`);
  }

  // ===== 私有方法 =====

  /**
   * 生成 JWT 双 Token（Access + Refresh）
   *
   * Access Token: 2h 有效期，通过 Authorization header 传递
   * Refresh Token: 7d（remember=true 时 30d），通过 HttpOnly Cookie 传递，同时存数据库
   */
  private async generateTokens(
    userId: number,
    email: string,
    username: string,
    roles: string[],
    rememberMe = false,
  ) {
    const payload: JwtPayload = { sub: userId, email, username, roles };

    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '2h');
    const refreshExpiresIn = rememberMe
      ? this.configService.get<string>('JWT_REFRESH_REMEMBER_EXPIRES_IN', '30d')
      : this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    const accessToken = this.jwtService.sign(payload as any, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresIn as any,
    } as any);

    const refreshToken = this.jwtService.sign(payload as any, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn as any,
    } as any);

    // 存储 Refresh Token 到数据库
    const refreshExpiresInSeconds = this.parseExpiresIn(refreshExpiresIn);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + refreshExpiresInSeconds * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      accessExpiresIn: this.parseExpiresIn(accessExpiresIn),
    };
  }

  /**
   * 解析 expiresIn 字符串为秒数
   * 支持格式：'2h', '7d', '30d', '60m', '3600s'
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)\s*(s|m|h|d)$/);
    if (!match) return 7200; // 默认 2h
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 7200;
    }
  }
}
