// ===================================================================
// 根模块 — 组装所有功能模块
// ===================================================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { CommonModule } from './common/common.module';
import { ConfigAppModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

/**
 * 应用根模块
 *
 * 组装顺序:
 * 1. ConfigModule — 全局环境变量（.env）
 * 2. WinstonModule — 全局日志
 * 3. CommonModule — 全局通用组件（过滤器/拦截器/管道）
 * 4. HealthModule — 健康检查（S0 验证）
 * 5. 业务模块 — S1-S9 逐步添加
 */
@Module({
  imports: [
    // ---- 全局环境变量 ----
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // ---- 全局日志 (Winston) ----
    WinstonModule.forRoot({
      transports: [
        // 控制台输出
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              const ctx = context ? `[${context}]` : '';
              const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${String(timestamp)} ${level} ${ctx} ${String(message)}${extra}`;
            }),
          ),
        }),
        // 文件输出 — 错误日志
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB 轮转
          maxFiles: 5,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        // 文件输出 — 所有日志
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),

    // ---- 基础设施模块 ----
    ConfigAppModule,
    CommonModule,
    PrismaModule,
    RedisModule,
    MailModule,
    HealthModule,

    // ---- S1: 认证与用户体系 ----
    AuthModule,
    UserModule,

    // TODO: S2-S9 逐步添加业务模块
    // ArticleModule,
    // CommentModule,
    // CategoryModule,
    // TagModule,
    // UploadModule,
    // AdminModule,
    // AnalyticsModule,
    // SeoModule,
  ],
})
export class AppModule {}
