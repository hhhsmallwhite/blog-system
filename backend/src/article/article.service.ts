// ===================================================================
// ArticleService — 文章业务逻辑
// ===================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { AutosaveDto } from './dto/autosave.dto';

/**
 * ArticleService
 *
 * 文章核心业务逻辑：
 * - CRUD（创建/读取/更新/删除）
 * - 发布/取消发布
 * - 自动保存草稿
 * - 读者端 slug 访问
 * - 归档数据
 *
 * 文章状态流转：draft → published → (unpublish) → draft
 */
@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===== 1. 创建文章（草稿） =====

  /**
   * 创建文章（默认为草稿状态）
   * @param authorId 作者 ID
   * @param dto 创建数据
   * @returns 创建的文章
   */
  async create(authorId: number, dto: CreateArticleDto) {
    // 生成 slug（如果未提供）
    const slug = dto.slug || this.generateSlug(dto.title);

    // 检查 slug 唯一性
    const existingSlug = await this.prisma.article.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException('slug 已存在，请使用其他 slug');
    }

    // 检查分类是否存在（如果提供了 categoryId）
    let categoryName: string | null = null;
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, userId: authorId, deletedAt: null },
      });
      if (!category) {
        throw new BadRequestException('分类不存在');
      }
      categoryName = category.name;
    }

    // 计算字数
    const wordCount = this.countWords(dto.content);

    // 获取作者信息
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { username: true, blogName: true, avatar: true },
    });

    // 创建文章 + 处理标签
    const article = await this.prisma.$transaction(async (tx) => {
      // 创建文章
      const newArticle = await tx.article.create({
        data: {
          authorId,
          slug,
          title: dto.title,
          content: dto.content,
          summary: dto.summary,
          coverImage: dto.coverImage,
          categoryId: dto.categoryId,
          status: 'draft',
          contentType: (dto.contentType as any) || 'markdown',
          metaTitle: dto.metaTitle,
          metaDescription: dto.metaDescription,
          isFeatured: dto.isFeatured ?? false,
          allowComment: dto.allowComment ?? true,
          wordCount,
          categoryName,
          authorName: author?.blogName || author?.username || null,
          authorAvatar: author?.avatar || null,
        },
      });

      // 处理标签
      if (dto.tags && dto.tags.length > 0) {
        await this.syncTags(tx, newArticle.id, dto.tags);
      }

      return newArticle;
    });

    return this.findOneById(authorId, article.id);
  }

  // ===== 2. 查询文章列表（管理端） =====

  /**
   * 查询当前用户的文章列表（管理端，包含草稿）
   * @param authorId 作者 ID
   * @param page 页码
   * @param pageSize 每页数量
   * @param status 状态筛选
   * @returns 文章列表
   */
  async findAllByAuthor(
    authorId: number,
    page = 1,
    pageSize = 10,
    status?: string,
  ) {
    const skip = (page - 1) * pageSize;
    const where: any = { authorId, deletedAt: null };
    if (status) {
      where.status = status;
    }

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          coverImage: true,
          status: true,
          categoryName: true,
          commentCount: true,
          likeCount: true,
          wordCount: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          publishedAt: true,
          articleTags: {
            select: {
              tag: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      list: articles.map((a) => ({
        ...a,
        tags: a.articleTags.map((at) => at.tag),
        articleTags: undefined,
      })),
      total,
      page,
      pageSize,
    };
  }

  // ===== 3. 查询单个文章（管理端，by ID） =====

  /**
   * 根据 ID 查询文章（管理端，包含草稿）
   */
  async findOneById(authorId: number, id: number) {
    const article = await this.prisma.article.findFirst({
      where: { id, authorId, deletedAt: null },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        articleTags: {
          select: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    return {
      ...article,
      tags: article.articleTags.map((at) => at.tag),
      articleTags: undefined,
    };
  }

  // ===== 4. 读者端：通过 slug 查询文章 =====

  /**
   * 读者端：通过 slug 查询已发布文章
   * 自动增加阅读量
   */
  async findOneBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug, deletedAt: null, status: 'published' },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        articleTags: {
          select: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('文章不存在或未发布');
    }

    // 异步增加阅读量（不阻塞响应）
    this.incrementViewCount(article.id).catch((err) => {
      this.logger.error(`增加阅读量失败: ${err.message}`);
    });

    return {
      ...article,
      tags: article.articleTags.map((at) => at.tag),
      articleTags: undefined,
    };
  }

  // ===== 5. 更新文章 =====

  /**
   * 更新文章（仅作者本人）
   */
  async update(authorId: number, id: number, dto: UpdateArticleDto) {
    const article = await this.findOneById(authorId, id);

    // 检查 slug 唯一性（如果修改了 slug）
    if (dto.slug && dto.slug !== article.slug) {
      const existingSlug = await this.prisma.article.findUnique({
        where: { slug: dto.slug },
      });
      if (existingSlug) {
        throw new ConflictException('slug 已存在');
      }
    }

    // 检查分类（如果修改了 categoryId）
    let categoryName: string | null = article.categoryName;
    if (dto.categoryId !== undefined) {
      if (dto.categoryId) {
        const category = await this.prisma.category.findFirst({
          where: { id: dto.categoryId, userId: authorId, deletedAt: null },
        });
        if (!category) {
          throw new BadRequestException('分类不存在');
        }
        categoryName = category.name;
      } else {
        categoryName = null;
      }
    }

    // 计算字数（如果修改了内容）
    const wordCount = article.wordCount;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.article.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.summary !== undefined && { summary: dto.summary }),
          ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
          ...(dto.categoryId !== undefined && {
            categoryId: dto.categoryId,
            categoryName,
          }),
          ...(dto.slug !== undefined && { slug: dto.slug }),
          ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
          ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
          ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
          ...(dto.allowComment !== undefined && { allowComment: dto.allowComment }),
          version: { increment: 1 },
        },
      });

      // 处理标签更新
      if (dto.tags !== undefined) {
        await this.syncTags(tx, id, dto.tags);
      }

      return updated;
    });
  }

  // ===== 6. 发布文章 =====

  /**
   * 发布文章（draft → published）
   */
  async publish(authorId: number, id: number) {
    const article = await this.findOneById(authorId, id);

    if (article.status === 'published') {
      throw new BadRequestException('文章已发布');
    }

    // 确保 slug 存在
    if (!article.slug) {
      throw new BadRequestException('发布前需要设置 slug');
    }

    return this.prisma.article.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  // ===== 7. 取消发布 =====

  /**
   * 取消发布（published → draft）
   */
  async unpublish(authorId: number, id: number) {
    const article = await this.findOneById(authorId, id);

    if (article.status !== 'published') {
      throw new BadRequestException('文章未发布，无法取消');
    }

    return this.prisma.article.update({
      where: { id },
      data: {
        status: 'draft',
        version: { increment: 1 },
      },
    });
  }

  // ===== 8. 自动保存草稿 =====

  /**
   * 自动保存（仅更新标题和内容）
   * 如果没有 articleId，则创建新草稿
   */
  async autosave(authorId: number, dto: AutosaveDto) {
    if (dto.articleId) {
      // 更新现有草稿
      const article = await this.findOneById(authorId, dto.articleId);

      const wordCount = this.countWords(dto.content);

      const updated = await this.prisma.article.update({
        where: { id: dto.articleId },
        data: {
          title: dto.title,
          content: dto.content,
          wordCount,
          version: { increment: 1 },
        },
      });

      return { id: updated.id, updatedAt: updated.updatedAt };
    } else {
      // 创建新草稿
      const slug = this.generateSlug(dto.title);
      const wordCount = this.countWords(dto.content);

      const author = await this.prisma.user.findUnique({
        where: { id: authorId },
        select: { username: true, blogName: true, avatar: true },
      });

      const article = await this.prisma.article.create({
        data: {
          authorId,
          slug,
          title: dto.title,
          content: dto.content,
          status: 'draft',
          wordCount,
          authorName: author?.blogName || author?.username || null,
          authorAvatar: author?.avatar || null,
        },
      });

      return { id: article.id, updatedAt: article.updatedAt };
    }
  }

  // ===== 9. 删除文章（软删除） =====

  /**
   * 删除文章（软删除）
   */
  async remove(authorId: number, id: number) {
    await this.findOneById(authorId, id);

    await this.prisma.article.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: '文章已删除' };
  }

  // ===== 10. 归档数据 =====

  /**
   * 读者端：查询某用户的文章归档（按年月分组）
   */
  async findArchive(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const articles = await this.prisma.article.findMany({
      where: {
        authorId: user.id,
        status: 'published',
        deletedAt: null,
      },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        publishedAt: true,
      },
    });

    // 按年月分组
    const archive: Record<string, Record<string, typeof articles>> = {};
    for (const article of articles) {
      if (!article.publishedAt) continue;
      const date = new Date(article.publishedAt);
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');

      if (!archive[year]) archive[year] = {};
      if (!archive[year][month]) archive[year][month] = [];
      archive[year][month].push(article);
    }

    return archive;
  }

  // ===== 辅助方法 =====

  /**
   * 生成 URL 友好的 slug
   */
  private generateSlug(title: string): string {
    // 中文标题：使用时间戳 + 随机字符串
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `post-${timestamp}${random}`;
  }

  /**
   * 计算字数
   */
  private countWords(content: string): number {
    // 去除 Markdown 语法标记后计算
    const plainText = content
      .replace(/```[\s\S]*?```/g, '') // 代码块
      .replace(/`[^`]+`/g, '') // 行内代码
      .replace(/!\[.*?\]\(.*?\)/g, '') // 图片
      .replace(/\[.*?\]\(.*?\)/g, '') // 链接
      .replace(/[#*_-~>]/g, ''); // Markdown 符号

    // 中文字符 + 英文单词
    const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (plainText.match(/[a-zA-Z]+/g) || []).length;

    return chineseChars + englishWords;
  }

  /**
   * 同步标签（创建不存在的标签 + 关联）
   */
  private async syncTags(tx: any, articleId: number, tagNames: string[]) {
    // 删除旧标签关联
    await tx.articleTag.deleteMany({
      where: { articleId },
    });

    if (tagNames.length === 0) return;

    // 查找或创建标签
    const tagIds: number[] = [];
    for (const name of tagNames) {
      const trimmedName = name.trim();
      if (!trimmedName) continue;

      // 查找标签
      let tag = await tx.tag.findUnique({
        where: { name: trimmedName },
      });

      // 创建标签
      if (!tag) {
        tag = await tx.tag.create({
          data: {
            name: trimmedName,
            slug: trimmedName
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, ''),
          },
        });
      }

      tagIds.push(tag.id);
    }

    // 创建新的标签关联
    if (tagIds.length > 0) {
      await tx.articleTag.createMany({
        data: tagIds.map((tagId) => ({ articleId, tagId })),
        skipDuplicates: true,
      });

      // 更新标签使用次数
      await tx.tag.updateMany({
        where: { id: { in: tagIds } },
        data: { usageCount: { increment: 1 } },
      });
    }
  }

  /**
   * 异步增加阅读量
   */
  private async incrementViewCount(articleId: number) {
    // 更新文章的冗余字段（如果有）
    // 实际阅读量统计在 ArticleViewDaily 表中
    await this.prisma.articleViewDaily.create({
      data: {
        articleId,
        viewDate: new Date(),
        viewCount: 1,
      },
    });
  }
}
