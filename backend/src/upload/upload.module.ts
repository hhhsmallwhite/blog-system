// ===================================================================
// UploadModule — 文件上传模块
// ===================================================================

import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

/**
 * UploadModule
 *
 * 文件上传模块，提供图片上传、媒体库查询、删除功能。
 * MVP 使用本地存储，后续可切换到阿里云 OSS。
 * 依赖 PrismaModule（全局）和 ConfigModule（全局）。
 */
@Module({
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
