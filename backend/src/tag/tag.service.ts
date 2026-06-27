// ===================================================================
// TagService — 标签业务逻辑
// ===================================================================

import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TagService
 *
 * 标签是全局共享的（不按用户隔离）。
 * - usageCount 冗余字段记录使用次数
 * - 创建文章时自动创建不存在的标签
 * - 删除文章时自动减少 usageCount
 */
@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===== 1. 查询所有标签 =====

  /**
   * 查询所有标签（按使用次数降序）
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 标签列表
   */
  async findAll(page = 1, pageSize = 50) {
    const skip = (page - 1) * pageSize;

    const [tags, total] = await Promise.all([
      this.prisma.tag.findMany({
        orderBy: { usageCount: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          slug: true,
          usageCount: true,
        },
      }),
      this.prisma.tag.count(),
    ]);

    return {
      list: tags,
      total,
      page,
      pageSize,
    };
  }

  // ===== 2. 查询用户使用的标签 =====

  /**
   * 查询某用户使用过的标签
   * @param username 用户名
   * @returns 标签列表
   */
  async findByUser(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 查询该用户文章关联的标签（去重）
    const tags = await this.prisma.tag.findMany({
      where: {
        articleTags: {
          some: {
            article: {
              authorId: user.id,
              deletedAt: null,
            },
          },
        },
      },
      orderBy: { usageCount: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        usageCount: true,
      },
    });

    return tags;
  }

  // ===== 3. 查询标签下的文章 =====

  /**
   * 读者端：查询某标签下的已发布文章
   * @param tagSlugOrName 标签 slug 或名称
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 文章列表
   */
  async findArticlesByTag(tagSlugOrName: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;

    // 查找标签（先尝试 slug，再尝试 name）
    const tag = await this.prisma.tag.findFirst({
      where: {
        OR: [{ slug: tagSlugOrName }, { name: tagSlugOrName }],
      },
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where: {
          deletedAt: null,
          status: 'published',
          articleTags: {
            some: { tagId: tag.id },
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          coverImage: true,
          categoryName: true,
          authorName: true,
          authorAvatar: true,
          commentCount: true,
          likeCount: true,
          wordCount: true,
          publishedAt: true,
        },
      }),
      this.prisma.article.count({
        where: {
          deletedAt: null,
          status: 'published',
          articleTags: {
            some: { tagId: tag.id },
          },
        },
      }),
    ]);

    return {
      tag: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        usageCount: tag.usageCount,
      },
      list: articles,
      total,
      page,
      pageSize,
    };
  }
}
