// ===================================================================
// CategoryModule — 分类模块
// ===================================================================

import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

/**
 * CategoryModule
 *
 * 分类模块，提供分类的 CRUD 操作。
 * 依赖 PrismaModule（全局）。
 */
@Module({
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
