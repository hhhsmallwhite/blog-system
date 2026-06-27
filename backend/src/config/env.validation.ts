// ===================================================================
// 环境变量校验 Schema — 基于 Joi
// ===================================================================

import * as Joi from 'joi';

/**
 * Joi 校验 Schema
 *
 * 启动时自动校验 .env 文件中的环境变量。
 * 校验失败时应用不会启动，直接抛出明确的错误信息。
 */
export const envValidationSchema = Joi.object({
  // ---- 基本配置 ----
  PORT: Joi.number().default(3000).description('应用端口'),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .description('运行环境'),

  // ---- 数据库 ----
  DATABASE_URL: Joi.string()
    .required()
    .description('PostgreSQL 连接串 (prisma 格式)'),

  // ---- Redis ----
  REDIS_URL: Joi.string()
    .default('redis://localhost:6379')
    .description('Redis 连接串'),

  // ---- RabbitMQ ----
  RABBITMQ_URL: Joi.string()
    .default('amqp://blog_admin:blog_mq_secret_dev@localhost:5672')
    .description('RabbitMQ 连接串'),

  // ---- JWT ----
  JWT_ACCESS_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT Access Token 密钥（至少32字符）'),
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT Refresh Token 密钥（至少32字符）'),
  JWT_ACCESS_EXPIRES_IN: Joi.string()
    .default('2h')
    .description('Access Token 过期时间'),
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .default('7d')
    .description('Refresh Token 过期时间'),
  JWT_REFRESH_REMEMBER_EXPIRES_IN: Joi.string()
    .default('30d')
    .description('记住我 Refresh Token 过期时间'),

  // ---- SMTP 邮件 ----
  SMTP_HOST: Joi.string().default('smtp.example.com').description('SMTP 服务器地址'),
  SMTP_PORT: Joi.number().default(587).description('SMTP 端口'),
  SMTP_USER: Joi.string().allow('').default('').description('SMTP 用户名'),
  SMTP_PASS: Joi.string().allow('').default('').description('SMTP 密码'),
  SMTP_FROM: Joi.string().default('noreply@blog.com').description('发件人地址'),

  // ---- 阿里云 OSS ----
  OSS_REGION: Joi.string().default('oss-cn-hangzhou').description('OSS 区域'),
  OSS_BUCKET: Joi.string().allow('').default('').description('OSS Bucket 名称'),
  OSS_ACCESS_KEY_ID: Joi.string().allow('').default('').description('OSS AccessKey'),
  OSS_ACCESS_KEY_SECRET: Joi.string().allow('').default('').description('OSS SecretKey'),
  OSS_CDN_DOMAIN: Joi.string().allow('').default('').description('CDN 域名'),

  // ---- CORS ----
  CORS_ORIGIN: Joi.string()
    .default('http://localhost:5173')
    .description('允许的 CORS 源（逗号分隔）'),
});
