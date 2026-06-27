import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, SocialLinkDto } from './dto/update-profile.dto';

/**
 * UserService — 用户模块服务
 *
 * 提供当前用户资料读写、公开主页查询、社交链接管理等功能。
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取当前登录用户的完整资料
   *
   * 返回 email、username、blog_name、bio、avatar、
   * social_links、roles、post_count 等完整信息。
   */
  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        socialLinks: {
          orderBy: { sortOrder: 'asc' },
        },
        userRoles: {
          include: { role: true },
        },
        _count: {
          select: { articles: { where: { status: 'published', deletedAt: null } } },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({ code: 40401, message: '用户不存在' });
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      blog_name: user.blogName,
      bio: user.bio,
      avatar: user.avatar,
      social_links: user.socialLinks.map((sl) => ({
        platform: sl.platform,
        url: sl.url,
        display_name: sl.displayName,
        sort_order: sl.sortOrder,
      })),
      roles: user.userRoles.map((ur) => ur.role.name),
      status: user.status,
      post_count: user._count.articles,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  /**
   * 更新当前用户资料
   *
   * PATCH 语义：仅更新传入的字段。
   * social_links 为整体替换：先删除旧的，再创建新的。
   */
  async updateMe(userId: number, dto: UpdateProfileDto) {
    // 构建 Prisma data 对象（仅更新传入字段）
    const data: Record<string, any> = {};
    if (dto.blog_name !== undefined) data.blogName = dto.blog_name;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.avatar !== undefined) data.avatar = dto.avatar;

    // 事务：更新资料 + 替换社交链接
    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data,
        });
      }

      // 社交链接整体替换
      if (dto.social_links !== undefined) {
        // 删除旧的
        await tx.socialLink.deleteMany({ where: { userId } });
        // 创建新的
        if (dto.social_links.length > 0) {
          const links = dto.social_links.map((link: SocialLinkDto, index: number) => ({
            userId,
            platform: link.platform as any, // Prisma SocialPlatform enum
            url: link.url,
            displayName: link.display_name ?? null,
            sortOrder: index,
          }));
          await tx.socialLink.createMany({ data: links });
        }
      }
    });

    // 返回更新后的完整用户资料
    const updatedUser = await this.getMe(userId);
    this.logger.log(`用户资料已更新: userId=${userId}`);

    return updatedUser;
  }

  /**
   * 获取用户公开主页
   *
   * 不暴露 email、status、roles 等敏感信息。
   */
  async getUserByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        socialLinks: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { articles: { where: { status: 'published', deletedAt: null } } },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException({ code: 40402, message: '用户不存在' });
    }

    return {
      username: user.username,
      blog_name: user.blogName,
      bio: user.bio,
      avatar: user.avatar,
      social_links: user.socialLinks.map((sl) => ({
        platform: sl.platform,
        url: sl.url,
        display_name: sl.displayName,
      })),
      post_count: user._count.articles,
      created_at: user.createdAt,
    };
  }

  /**
   * 获取用户公开文章列表（读者端）
   *
   * MVP 阶段返回空列表 + 分页元数据。
   * 实际文章查询在 S5 实现。
   */
  async getUserArticles(username: string, page: number, perPage: number) {
    // 先验证用户存在
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException({ code: 40402, message: '用户不存在' });
    }

    // MVP: 返回空列表（文章在 S5 实现）
    return {
      items: [],
      total: 0,
      page,
      per_page: perPage,
    };
  }
}
