import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/**
 * AuthController 单元测试
 *
 * Mock AuthService，专注于测试路由层：
 * - 参数校验委托给 class-validator（此处不做测试）
 * - 验证 Controller 正确调用 Service 方法
 * - 验证响应格式符合统一规范
 */
describe('AuthController', () => {
  let controller: AuthController;
  let authServiceMock: any;

  beforeEach(async () => {
    authServiceMock = {
      register: jest.fn(),
      verifyEmail: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('应该被正确初始化', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/register', () => {
    it('调用 AuthService.register 并返回统一格式', async () => {
      const dto: RegisterDto = { email: 'test@test.com', password: 'Password123', username: 'test' };
      authServiceMock.register.mockResolvedValue({ id: 1, email: dto.email });

      const result = await controller.register(dto);

      expect(authServiceMock.register).toHaveBeenCalledWith(dto);
      expect(result.code).toBe(0);
      expect(result.data.email).toBe(dto.email);
    });
  });

  describe('POST /auth/verify-email', () => {
    it('调用 AuthService.verifyEmail 并返回 JWT', async () => {
      authServiceMock.verifyEmail.mockResolvedValue({
        access_token: 'token', user: { id: 1 },
      });

      const result = await controller.verifyEmail({ token: 'valid' });

      expect(result.code).toBe(0);
      expect(authServiceMock.verifyEmail).toHaveBeenCalledWith('valid');
    });
  });

  describe('POST /auth/login', () => {
    it('登录成功设置 Cookie', async () => {
      const dto: LoginDto = { email: 'test@test.com', password: 'Password123' };
      authServiceMock.login.mockResolvedValue({
        access_token: 'at', refresh_token: 'rt', expires_in: 7200,
        user: { id: 1, email: dto.email },
      });

      const mockRes = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
      };

      const result = await controller.login(dto, { ip: '127.0.0.1', headers: {} } as any, mockRes as any);

      expect(result.code).toBe(0);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token', 'rt', expect.any(Object),
      );
    });
  });

  describe('POST /auth/logout', () => {
    it('登出清除 Cookie', async () => {
      const mockRes = { clearCookie: jest.fn() };
      const result = await controller.logout(1, mockRes as any);

      expect(result.code).toBe(0);
      expect(mockRes.clearCookie).toHaveBeenCalled();
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('无论邮箱是否存在都返回成功', async () => {
      const result = await controller.forgotPassword({ email: 'test@test.com' });

      expect(result.code).toBe(0);
      expect(authServiceMock.forgotPassword).toHaveBeenCalledWith('test@test.com');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('成功重置密码', async () => {
      const result = await controller.resetPassword({
        token: 'valid', password: 'NewPassword123',
      });

      expect(result.code).toBe(0);
      expect(authServiceMock.resetPassword).toHaveBeenCalledWith('valid', 'NewPassword123');
    });
  });

  describe('POST /auth/change-password', () => {
    it('成功修改密码', async () => {
      const mockRes = { clearCookie: jest.fn() };
      const result = await controller.changePassword(1, {
        old_password: 'Old', new_password: 'NewPassword123',
      }, mockRes as any);

      expect(result.code).toBe(0);
      expect(mockRes.clearCookie).toHaveBeenCalled();
    });
  });
});
