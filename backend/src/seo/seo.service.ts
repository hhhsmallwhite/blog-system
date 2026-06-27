// ===================================================================
// SeoService — Sitemap + RSS Feed 生成
// ===================================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);
  private readonly baseUrl: string;

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
  }

  /** 生成 sitemap.xml */
  async generateSitemap(): Promise<string> {
    const articles = await this.prisma.article.findMany({
      where: { status: 'published', deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, updatedAt: true },
    });

    const urls = articles
      .map((a) => `  <url><loc>${this.baseUrl}/articles/${a.slug}</loc><lastmod>${a.updatedAt.toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${this.baseUrl}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n${urls}\n</urlset>`;
  }

  /** 生成 RSS Feed */
  async generateRss(): Promise<string> {
    const articles = await this.prisma.article.findMany({
      where: { status: 'published', deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: { title: true, slug: true, summary: true, authorName: true, publishedAt: true },
    });

    const items = articles
      .map((a) =>
        `    <item>\n      <title>${a.title}</title>\n      <link>${this.baseUrl}/articles/${a.slug}</link>\n      <description>${a.summary || ''}</description>\n      <author>${a.authorName || ''}</author>\n      <pubDate>${a.publishedAt?.toUTCString() || ''}</pubDate>\n      <guid>${this.baseUrl}/articles/${a.slug}</guid>\n    </item>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>博客</title>\n    <link>${this.baseUrl}</link>\n    <description>个人博客</description>\n${items}\n  </channel>\n</rss>`;
  }
}
