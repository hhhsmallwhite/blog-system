// ===================================================================
// 配置模块 — 全局 ConfigModule 封装
// ===================================================================

import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import configuration from './configuration';
import { envValidationSchema } from './env.validation';

/**
 * 全局配置模块
 *
 * 功能:
 * - 加载 .env 文件
 * - 校验环境变量格式 (Joi)
 * - 提供类型安全的 ConfigService
 * - 全局可用 (isGlobal: true)
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,       // 允许未校验的变量（不抛异常）
        abortEarly: false,        // 收集所有错误后一起报告
      },
      envFilePath: ['.env', '.env.local'],
      cache: true,                // 缓存配置以提高性能
    }),
  ],
})
export class ConfigAppModule {}
