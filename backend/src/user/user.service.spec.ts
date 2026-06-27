import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * UserService 单元测试
 */
describe('UserService', () => {
  let service: UserService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      socialLink: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((fn: Function) => fn(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('应该被正确初始化', () => {
    expect(service).toBeDefined();
  });

  // ===== getMe =====

  describe('getMe', () => {
    it('返回当前用户完整资料', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        blogName: 'My Blog',
        bio: 'Developer',
        avatar: null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        socialLinks: [
          { platform: 'github', url: 'https://github.com/test', displayName: null, sortOrder: 0 },
        ],
        userRoles: [{ role: { name: 'author' } }],
        _count: { articles: 5 },
      });

      const result = await service.getMe(1);

      expect(result.email).toBe('test@example.com');
      expect(result.roles).toContain('author');
      expect(result.social_links.length).toBe(1);
      expect(result.post_count).toBe(5);
    });

    it('用户不存在抛出 NotFoundException', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.getMe(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ===== updateMe =====

  describe('updateMe', () => {
    it('更新 blog_name 和 bio', async () => {
      // 第一次查询用于 updateMe
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        blogName: 'New Blog',
        bio: 'New Bio',
        avatar: null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        socialLinks: [],
        userRoles: [{ role: { name: 'author' } }],
        _count: { articles: 0 },
      });

      const result = await service.updateMe(1, {
        blog_name: 'New Blog',
        bio: 'New Bio',
      });

      expect(result.blog_name).toBe('New Blog');
      expect(result.bio).toBe('New Bio');
    });

    it('整体替换社交链接', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        blogName: null,
        bio: null,
        avatar: null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        socialLinks: [
          { platform: 'github', url: 'https://gh.com', displayName: null, sortOrder: 0 },
        ],
        userRoles: [{ role: { name: 'author' } }],
        _count: { articles: 0 },
      });

      await service.updateMe(1, {
        social_links: [
          { platform: 'twitter', url: 'https://x.com/test' },
        ],
      });

      expect(prismaMock.socialLink.deleteMany).toHaveBeenCalledWith({ where: { userId: 1 } });
      expect(prismaMock.socialLink.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 1, platform: 'twitter', url: 'https://x.com/test', displayName: null, sortOrder: 0 },
        ],
      });
    });
  });

  // ===== getUserByUsername =====

  describe('getUserByUsername', () => {
    it('返回用户公开资料（不含敏感信息）', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        username: 'publicuser',
        blogName: 'Public Blog',
        bio: 'A blogger',
        avatar: null,
        deletedAt: null,
        socialLinks: [],
        _count: { articles: 3 },
        createdAt: new Date(),
      });

      const result = await service.getUserByUsername('publicuser');

      expect(result.username).toBe('publicuser');
      // 不含 email
      expect((result as any).email).toBeUndefined();
      // 不含 roles
      expect((result as any).roles).toBeUndefined();
    });

    it('已删除用户抛出 NotFoundException', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        username: 'deleted',
        deletedAt: new Date(),
      });

      await expect(service.getUserByUsername('deleted')).rejects.toThrow(NotFoundException);
    });
  });

  // ===== getUserArticles =====

  describe('getUserArticles', () => {
    it('MVP 阶段返回空列表', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        deletedAt: null,
      });

      const result = await service.getUserArticles('testuser', 1, 10);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('用户不存在抛出 NotFoundException', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserArticles('ghost', 1, 10)).rejects.toThrow(NotFoundException);
    });
  });
});
