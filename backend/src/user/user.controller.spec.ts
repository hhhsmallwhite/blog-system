import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

/**
 * UserController 单元测试
 */
describe('UserController', () => {
  let controller: UserController;
  let userServiceMock: any;

  beforeEach(async () => {
    userServiceMock = {
      getMe: jest.fn(),
      updateMe: jest.fn(),
      getUserByUsername: jest.fn(),
      getUserArticles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: userServiceMock }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('应该被正确初始化', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /users/me', () => {
    it('返回当前用户资料', async () => {
      userServiceMock.getMe.mockResolvedValue({ id: 1, username: 'test' });

      const result = await controller.getMe(1);

      expect(result.code).toBe(0);
      expect(userServiceMock.getMe).toHaveBeenCalledWith(1);
    });
  });

  describe('PATCH /users/me', () => {
    it('更新资料成功', async () => {
      userServiceMock.updateMe.mockResolvedValue({ id: 1, blog_name: 'New' });

      const result = await controller.updateMe(1, { blog_name: 'New' });

      expect(result.code).toBe(0);
      expect(result.message).toBe('资料更新成功');
    });
  });

  describe('GET /users/:username', () => {
    it('返回用户公开主页', async () => {
      userServiceMock.getUserByUsername.mockResolvedValue({ username: 'testuser' });

      const result = await controller.getUserByUsername('testuser');

      expect(result.code).toBe(0);
      expect(userServiceMock.getUserByUsername).toHaveBeenCalledWith('testuser');
    });
  });

  describe('GET /users/:username/articles', () => {
    it('返回文章分页列表', async () => {
      userServiceMock.getUserArticles.mockResolvedValue({ items: [], total: 0, page: 1, per_page: 10 });

      const result = await controller.getUserArticles('testuser', '1', '10');

      expect(result.code).toBe(0);
      expect(userServiceMock.getUserArticles).toHaveBeenCalledWith('testuser', 1, 10);
    });
  });
});
