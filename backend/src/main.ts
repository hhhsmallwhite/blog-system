// ===================================================================
// NestJS 应用入口 — Bootstrap
// ===================================================================

import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

/**
 * 启动 NestJS 应用
 *
 * 全局配置:
 * - 路径前缀: /api/v1
 * - CORS: 开发环境允许 localhost:5173
 * - 安全: Helmet (HTTP 头安全) + Compression (响应压缩)
 * - 参数校验: class-validator + ValidationPipe
 * - Swagger: 仅非生产环境启用
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Winston 日志集成（由 AppModule 中的 WinstonModule 处理）
  });

  const logger = new Logger('Bootstrap');

  // ---- 全局中间件 ----
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // ---- 全局前缀 ----
  app.setGlobalPrefix('api/v1');

  // ---- CORS ----
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // ---- 全局过滤器 ----
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ---- 全局拦截器 ----
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );

  // ---- 全局验证管道 ----
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // 剔除未声明的属性
      forbidNonWhitelisted: true, // 存在未声明属性时抛出错误
      transform: true,            // 自动类型转换
      transformOptions: {
        enableImplicitConversion: true, // 隐式类型转换 (字符串 → 数字)
      },
      stopAtFirstError: false,   // 收集所有校验错误后一起返回
    }),
  );

  // ---- Swagger 文档 (仅非生产环境) ----
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('博客系统 API')
      .setDescription('面向个人创作者的轻量级博客平台 REST API')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '输入 JWT Access Token',
        },
        'access-token',
      )
      .addCookieAuth('refresh_token', {
        type: 'apiKey',
        in: 'cookie',
        description: 'Refresh Token (HttpOnly Cookie)',
      })
      .addTag('Auth', '认证模块')
      .addTag('User', '用户模块')
      .addTag('Article', '文章模块')
      .addTag('Comment', '评论模块')
      .addTag('Category', '分类模块')
      .addTag('Tag', '标签模块')
      .addTag('Upload', '上传模块')
      .addTag('Admin', '管理后台')
      .addTag('Analytics', '分析统计')
      .addTag('SEO', 'SEO 模块')
      .addTag('Health', '健康检查')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
      },
    });
    logger.log('Swagger 文档已启动: /api/docs');
  }

  // ---- 启动 ----
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`应用已启动: http://localhost:${port}`);
  logger.log(`API 基础路径: http://localhost:${port}/api/v1`);
  logger.log(`运行模式: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
