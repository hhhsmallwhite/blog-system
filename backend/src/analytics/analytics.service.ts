// ===================================================================
// AnalyticsService — 统计分析
// ===================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  constructor(private readonly prisma: PrismaService) {}

  /** 记录阅读量 */
  async recordView(articleId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    try {
      await this.prisma.articleViewDaily.upsert({
        where: { articleId_viewDate: { articleId, viewDate: today } },
        create: { articleId, viewDate: today, viewCount: 1 },
        update: { viewCount: { increment: 1 } },
      });
    } catch (err) {
      this.logger.error(`记录阅读量失败: ${err}`);
    }
  }

  /** 文章统计 */
  async getArticleStats(articleId: number) {
    const [views, trends] = await Promise.all([
      this.prisma.articleViewDaily.aggregate({ where: { articleId }, _sum: { viewCount: true } }),
      this.prisma.articleViewDaily.findMany({
        where: { articleId, viewDate: { gte: new Date(Date.now() - 30 * 86400000) } },
        orderBy: { viewDate: 'asc' },
        select: { viewDate: true, viewCount: true },
      }),
    ]);
    return { totalViews: views._sum.viewCount || 0, trends };
  }

  /** 趋势统计 */
  async getTrends() {
    const days = 7;
    const startDate = new Date(Date.now() - days * 86400000);
    startDate.setHours(0, 0, 0, 0);
    const data = await this.prisma.articleViewDaily.groupBy({
      by: ['viewDate'],
      where: { viewDate: { gte: startDate } },
      _sum: { viewCount: true },
    });
    return data.map((d) => ({ date: d.viewDate, views: d._sum.viewCount || 0 }));
  }
}
