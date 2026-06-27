// ===================================================================
// 应用配置 — 集中管理所有环境变量
// ===================================================================

/**
 * 配置接口定义
 */
export interface AppConfig {
  /** 运行端口 */
  port: number;
  /** 运行环境: development | production | test */
  nodeEnv: string;

  /** PostgreSQL 连接串 */
  databaseUrl: string;
  /** Redis 连接串 */
  redisUrl: string;
  /** RabbitMQ 连接串 */
  rabbitmqUrl: string;

  /** JWT 密钥 */
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
    refreshRememberExpiresIn: string;
  };

  /** SMTP 邮件服务 */
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };

  /** 阿里云 OSS */
  oss: {
    region: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
    cdnDomain: string;
  };

  /** CORS 允许的源 */
  corsOrigin: string;
}

/**
 * 加载并返回应用配置
 *
 * 读取 process.env 并返回类型安全的配置对象。
 * 所有环境变量必须在 .env.validation.ts 中校验后使用。
 */
export default (): AppConfig => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  databaseUrl: process.env.DATABASE_URL || 'postgresql://blog_admin:blog_secret_dev@localhost:5432/blog_db',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://blog_admin:blog_mq_secret_dev@localhost:5672',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '2h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    refreshRememberExpiresIn: process.env.JWT_REFRESH_REMEMBER_EXPIRES_IN || '30d',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@blog.com',
  },

  oss: {
    region: process.env.OSS_REGION || 'oss-cn-hangzhou',
    bucket: process.env.OSS_BUCKET || '',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    cdnDomain: process.env.OSS_CDN_DOMAIN || '',
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
});
