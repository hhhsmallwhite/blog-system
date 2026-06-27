// ===================================================================
// CategoryService — 分类业务逻辑
// ===================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/**
 * CategoryService
 *
 * 分类按用户隔离：
 * - 同一用户下分类名和 slug 唯一
 * - 支持层级分类（parentId）
 * - 软删除（deletedAt）
 * - 删除分类时，关联文章的 categoryId 设为 null（SetNull）
 */
@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===== 1. 创建分类 =====

  /**
   * 创建分类
   * @param userId 当前用户 ID
   * @param dto 创建数据
   * @returns 创建的分类
   */
  async create(userId: number, dto: CreateCategoryDto) {
    // 检查同名分类
    const existing = await this.prisma.category.findFirst({
      where: { userId, name: dto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('分类名称已存在');
    }

    // 检查 slug 唯一性（如果提供了 slug）
    if (dto.slug) {
      const existingSlug = await this.prisma.category.findFirst({
        where: { userId, slug: dto.slug, deletedAt: null },
      });
      if (existingSlug) {
        throw new ConflictException('分类 slug 已存在');
      }
    }

    // 检查父分类是否存在（如果提供了 parentId）
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, userId, deletedAt: null },
      });
      if (!parent) {
        throw new BadRequestException('父分类不存在');
      }
    }

    return this.prisma.category.create({
      data: {
        userId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        parentId: dto.parentId,
      },
    });
  }

  // ===== 2. 查询用户分类列表 =====

  /**
   * 查询当前用户的所有分类（管理端）
   * @param userId 当前用户 ID
   * @returns 分类列表（树形结构）
   */
  async findAllByUser(userId: number) {
    const categories = await this.prisma.category.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: {
            articles: { where: { deletedAt: null } },
          },
        },
      },
    });

    // 构建树形结构
    return this.buildTree(categories);
  }

  // ===== 3. 查询单个分类 =====

  /**
   * 根据 ID 查询分类
   */
  async findOne(userId: number, id: number) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        _count: {
          select: {
            articles: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    return category;
  }

  // ===== 4. 更新分类 =====

  /**
   * 更新分类
   */
  async update(userId: number, id: number, dto: UpdateCategoryDto) {
    // 检查分类是否存在
    const category = await this.findOne(userId, id);

    // 检查名称冲突
    if (dto.name && dto.name !== category.name) {
      const existing = await this.prisma.category.findFirst({
        where: { userId, name: dto.name, deletedAt: null, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('分类名称已存在');
      }
    }

    // 检查 slug 冲突
    if (dto.slug && dto.slug !== category.slug) {
      const existingSlug = await this.prisma.category.findFirst({
        where: { userId, slug: dto.slug, deletedAt: null, NOT: { id } },
      });
      if (existingSlug) {
        throw new ConflictException('分类 slug 已存在');
      }
    }

    // 检查父分类（不能将自己设为父分类，不能形成循环）
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('不能将分类自身设为父分类');
      }
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, userId, deletedAt: null },
      });
      if (!parent) {
        throw new BadRequestException('父分类不存在');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
    });
  }

  // ===== 5. 删除分类（软删除） =====

  /**
   * 删除分类（软删除）
   * 关联文章的 categoryId 会被设为 null（SetNull）
   */
  async remove(userId: number, id: number) {
    // 检查分类是否存在
    await this.findOne(userId, id);

    // 软删除分类
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // 关联文章的 categoryId 设为 null
    await this.prisma.article.updateMany({
      where: { categoryId: id, deletedAt: null },
      data: { categoryId: null, categoryName: null },
    });

    return { message: '分类已删除' };
  }

  // ===== 6. 读者端：查询用户的公开分类 =====

  /**
   * 读者端：查询某用户的公开分类列表
   * 只返回有已发布文章的分类
   * @param username 用户名
   * @returns 分类列表
   */
  async findPublicCategories(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const categories = await this.prisma.category.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        articles: {
          some: { status: 'published', deletedAt: null },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: {
          select: {
            articles: { where: { status: 'published', deletedAt: null } },
          },
        },
      },
    });

    return categories;
  }

  // ===== 辅助方法：构建树形结构 =====

  /**
   * 将扁平数组构建为树形结构
   */
  private buildTree(categories: any[]): any[] {
    const map = new Map<number, any>();
    const roots: any[] = [];

    // 初始化 map
    for (const cat of categories) {
      map.set(cat.id, { ...cat, children: [] });
    }

    // 构建树
    for (const cat of categories) {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
