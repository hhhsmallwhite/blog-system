// ===================================================================
// AdminService — 管理后台业务逻辑
// ===================================================================

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(private readonly prisma: PrismaService) {}

  /** 获取仪表盘统计数据 */
  async getStats() {
    const [users, articles, comments, views] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.article.count({ where: { deletedAt: null } }),
      this.prisma.comment.count({ where: { deletedAt: null } }),
      this.prisma.articleViewDaily.aggregate({ _sum: { viewCount: true } }),
    ]);
    return {
      totalUsers: users,
      totalArticles: articles,
      totalComments: comments,
      totalViews: views._sum.viewCount || 0,
    };
  }

  /** 管理端文章列表 */
  async getArticles(page = 1, pageSize = 10, status?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = { deletedAt: null };
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.article.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: pageSize,
        select: { id: true, title: true, slug: true, status: true, authorName: true, commentCount: true, likeCount: true, publishedAt: true, createdAt: true },
      }),
      this.prisma.article.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  /** 管理端评论列表 */
  async getComments(page = 1, pageSize = 10, status?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = { deletedAt: null };
    if (status === 'pending') where.reviewed = false;

    const [list, total] = await Promise.all([
      this.prisma.comment.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: pageSize,
        select: { id: true, content: true, authorName: true, reviewed: true, createdAt: true,
          article: { select: { id: true, title: true } },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  /** 审核评论 */
  async reviewComment(id: number) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('评论不存在');
    return this.prisma.comment.update({ where: { id }, data: { reviewed: true } });
  }

  /** 删除评论 */
  async deleteComment(id: number) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('评论不存在');
    return this.prisma.comment.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** 用户列表 */
  async getUsers(page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, skip, take: pageSize,
        select: { id: true, email: true, username: true, status: true, createdAt: true,
          _count: { select: { articles: true } },
          userRoles: { select: { role: { select: { name: true } } } },
        },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);
    return {
      list: list.map((u) => ({ ...u, roles: u.userRoles.map((r) => r.role.name), userRoles: undefined })),
      total, page, pageSize,
    };
  }

  /** 冻结/解冻用户 */
  async toggleFreeze(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.deletedAt) throw new BadRequestException('用户已注销');
    const newStatus = user.status === 'active' ? 'frozen' : 'active';
    return this.prisma.user.update({ where: { id: userId }, data: { status: newStatus } });
  }

  /** 修改用户角色 */
  async updateRole(userId: number, roleId: number) {
    await this.prisma.userRole.deleteMany({ where: { userId } });
    return this.prisma.userRole.create({ data: { userId, roleId } });
  }
}
