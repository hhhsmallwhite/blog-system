// ===================================================================
// TagModule — 标签模块
// ===================================================================

import { Module } from '@nestjs/common';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';

/**
 * TagModule
 *
 * 标签模块，提供标签查询功能。
 * 标签全局共享，不按用户隔离。
 * 依赖 PrismaModule（全局）。
 */
@Module({
  controllers: [TagController],
  providers: [TagService],
  exports: [TagService],
})
export class TagModule {}
