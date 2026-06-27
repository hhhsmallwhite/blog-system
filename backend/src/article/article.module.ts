// ===================================================================
// ArticleModule — 文章模块
// ===================================================================

import { Module } from '@nestjs/common';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';

/**
 * ArticleModule
 *
 * 文章模块，提供文章的完整 CRUD + 发布/取消发布/自动保存 + 读者端访问。
 * 依赖 PrismaModule（全局）。
 */
@Module({
  controllers: [ArticleController],
  providers: [ArticleService],
  exports: [ArticleService],
})
export class ArticleModule {}
