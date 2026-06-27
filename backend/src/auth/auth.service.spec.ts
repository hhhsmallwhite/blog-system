import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';

/**
 * AuthService 单元测试
 *
 * Mock 所有外部依赖（Prisma、Redis、Mail、JWT、Config），
 * 专注于测试业务逻辑流程。
 */
describe('AuthService', () => {
  let service: AuthService;

  // Mock 对象
  let prismaMock: any;
  let redisMock: any;
  let mailMock: any;
  let jwtMock: any;

  beforeEach(async () => {
    // 构建 Prisma Mock（链式调用 + 事务）
    prismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      role: { findUnique: jest.fn() },
      userRole: { create: jest.fn() },
      verificationToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((ops) => Promise.resolve(ops)),
    };

    // Redis Mock
    redisMock = {
      getLoginLockTTL: jest.fn().mockResolvedValue(0),
      recordLoginFailure: jest.fn().mockResolvedValue(1),
      clearLoginAttempts: jest.fn().mockResolvedValue(undefined),
    };

    // Mail Mock
    mailMock = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    // JWT Mock
    jwtMock = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const configMock = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '2h';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        if (key === 'JWT_REFRESH_REMEMBER_EXPIRES_IN') return '30d';
        if (key === 'APP_URL') return 'http://localhost:5173';
        return defaultValue;
      }),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        return 'test-secret';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: redisMock },
        { provide: MailService, useValue: mailMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ===== register =====

  describe('register', () => {
    const dto = { email: 'test@example.com', password: 'Password123', username: 'testuser' };

    it('应该成功注册新用户', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null); // email 不存在
      prismaMock.user.findUnique.mockResolvedValueOnce(null); // username 不存在
      prismaMock.role.findUnique.mockResolvedValue({ id: 1, name: 'author' });
      prismaMock.$transaction.mockImplementation(async (fn: Function) => {
        return fn({
          user: {
            create: jest.fn().mockResolvedValue({
              id: 1, email: dto.email, username: dto.username,
              status: 'pending_verification', createdAt: new Date(),
            }),
          },
          userRole: { create: jest.fn() },
          verificationToken: { create: jest.fn().mockResolvedValue({ token: 'test-token' }) },
        });
      });

      const result = await service.register(dto);

      expect(result.email).toBe(dto.email);
      expect(result.username).toBe(dto.username);
      expect(result.status).toBe('pending_verification');
      expect(mailMock.sendVerificationEmail).toHaveBeenCalled();
    });

    it('邮箱已被注册时抛出 ConflictException', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1 });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('用户名已被占用时抛出 ConflictException', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: 2 });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ===== verifyEmail =====

  describe('verifyEmail', () => {
    const mockUser = {
      id: 1, email: 'test@example.com', username: 'testuser',
      status: 'pending_verification', avatar: null, blogName: null, bio: null,
      userRoles: [{ role: { name: 'author' } }],
    };

    it('验证成功后返回 JWT 和用户信息', async () => {
      prismaMock.verificationToken.findUnique.mockResolvedValue({
        id: 1, token: 'valid-token', type: 'email_verification',
        isUsed: false, expiresAt: new Date(Date.now() + 3600000),
        user: mockUser,
      });

      const result = await service.verifyEmail('valid-token');

      expect(result.access_token).toBeDefined();
      expect(result.user.status).toBe('active');
    });

    it('Token 已过期时抛出 BadRequestException', async () => {
      prismaMock.verificationToken.findUnique.mockResolvedValue({
        id: 1, token: 'expired-token', type: 'email_verification',
        isUsed: false, expiresAt: new Date(Date.now() - 3600000),
        user: mockUser,
      });

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(BadRequestException);
    });

    it('Token 已使用时抛出 ConflictException', async () => {
      prismaMock.verificationToken.findUnique.mockResolvedValue({
        id: 1, token: 'used-token', type: 'email_verification',
        isUsed: true, expiresAt: new Date(Date.now() + 3600000),
        user: mockUser,
      });

      await expect(service.verifyEmail('used-token')).rejects.toThrow(ConflictException);
    });

    it('Token 不存在时抛出 BadRequestException', async () => {
      prismaMock.verificationToken.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail('nonexistent')).rejects.toThrow(BadRequestException);
    });
  });

  // ===== login =====

  describe('login', () => {
    const dto = { email: 'test@example.com', password: 'Password123' };
    const ip = '127.0.0.1';

    it('登录成功返回 JWT', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('Password123', 4);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1, email: dto.email, username: 'testuser',
        passwordHash: hash, status: 'active',
        avatar: null, blogName: null, bio: null, deletedAt: null,
        userRoles: [{ role: { name: 'author' } }],
      });

      const result = await service.login(dto, ip);

      expect(result.access_token).toBeDefined();
      expect(result.user.email).toBe(dto.email);
      expect(redisMock.clearLoginAttempts).toHaveBeenCalled();
    });

    it('密码错误抛出 UnauthorizedException', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('DifferentPwd', 4);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1, email: dto.email, username: 'testuser',
        passwordHash: hash, status: 'active', deletedAt: null,
        userRoles: [{ role: { name: 'author' } }],
      });

      await expect(service.login(dto, ip)).rejects.toThrow(UnauthorizedException);
      expect(redisMock.recordLoginFailure).toHaveBeenCalled();
    });

    it('账号锁定中抛出 UnauthorizedException (42902)', async () => {
      redisMock.getLoginLockTTL.mockResolvedValueOnce(600); // 10 分钟锁定

      await expect(service.login(dto, ip)).rejects.toThrow(UnauthorizedException);
    });

    it('邮箱未验证抛出 UnauthorizedException (40102)', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('Password123', 4);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1, email: dto.email, username: 'testuser',
        passwordHash: hash, status: 'pending_verification', deletedAt: null,
        userRoles: [{ role: { name: 'author' } }],
      });

      await expect(service.login(dto, ip)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ===== refreshToken =====

  describe('refreshToken', () => {
    it('返回新的 Access Token', async () => {
      const payload = {
        sub: 1, email: 'test@example.com', username: 'testuser',
        roles: ['author'], refreshToken: 'refresh-token-xxx',
      };

      const result = await service.refreshToken(payload);

      expect(result.access_token).toBeDefined();
      expect(result.expires_in).toBeGreaterThan(0);
    });
  });

  // ===== logout =====

  describe('logout', () => {
    it('撤销所有 Refresh Token', async () => {
      await service.logout(1);
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });

  // ===== forgotPassword =====

  describe('forgotPassword', () => {
    it('用户存在时发送邮件', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1, email: 'test@example.com', status: 'active',
      });

      await service.forgotPassword('test@example.com');

      expect(mailMock.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('用户不存在时不发送邮件（防枚举攻击）', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await service.forgotPassword('ghost@example.com');

      expect(mailMock.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  // ===== resetPassword =====

  describe('resetPassword', () => {
    it('成功重置密码', async () => {
      prismaMock.verificationToken.findUnique.mockResolvedValue({
        id: 1, token: 'valid-reset-token', userId: 1,
        type: 'password_reset', isUsed: false,
        expiresAt: new Date(Date.now() + 3600000),
      });

      await service.resetPassword('valid-reset-token', 'NewPassword123');

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it('Token 已过期抛出 BadRequestException', async () => {
      prismaMock.verificationToken.findUnique.mockResolvedValue({
        id: 1, token: 'expired-token', type: 'password_reset',
        isUsed: false, expiresAt: new Date(Date.now() - 3600000),
      });

      await expect(
        service.resetPassword('expired-token', 'NewPassword123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===== changePassword =====

  describe('changePassword', () => {
    it('成功修改密码', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('OldPassword123', 4);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1, passwordHash: hash,
      });

      await service.changePassword(1, 'OldPassword123', 'NewPassword456');

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it('旧密码错误抛出 UnauthorizedException', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('CorrectPwd', 4);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1, passwordHash: hash,
      });

      await expect(
        service.changePassword(1, 'WrongPwd', 'NewPassword456'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
