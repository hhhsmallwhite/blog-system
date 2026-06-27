import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * RedisService — Redis 缓存服务
 *
 * 封装 ioredis 客户端，提供常用操作方法。
 * 用于登录限流、会话管理、缓存等场景。
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  /** 模块初始化时创建 Redis 连接 */
  onModuleInit(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) return null; // 5 次重试后放弃
        return Math.min(times * 200, 2000);
      },
      reconnectOnError: (err) => {
        this.logger.warn(`Redis 连接错误: ${err.message}`);
        return true;
      },
    });

    this.client.on('connect', () => this.logger.log('Redis 连接已建立'));
    this.client.on('error', (err) => this.logger.error(`Redis 错误: ${err.message}`));
  }

  /** 应用关闭时断开 Redis 连接 */
  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis 连接已断开');
  }

  // ===== 基础操作 =====

  /** 获取字符串值 */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** 设置字符串值，支持过期时间（秒） */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /** 删除 key */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** 自增并返回新值，首次调用自动设 0 */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /** 设置 key 过期时间（秒） */
  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  /** 获取 key 的剩余 TTL（秒），-1 永久，-2 不存在 */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /** 检查 key 是否存在 */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // ===== 登录限流专用 =====

  /**
   * 记录登录失败次数
   * @param email 用户邮箱
   * @param lockMinutes 锁定时长（分钟），默认 15
   * @returns 当前失败次数
   */
  async recordLoginFailure(email: string, lockMinutes: number = 15): Promise<number> {
    const key = `login_attempts:${email}`;
    const count = await this.client.incr(key);
    if (count === 1) {
      // 首次失败，设置过期窗口
      await this.client.expire(key, lockMinutes * 60);
    }
    return count;
  }

  /**
   * 检查是否被锁定
   * @returns 锁定剩余时间（秒），0 表示未锁定
   */
  async getLoginLockTTL(email: string): Promise<number> {
    const key = `login_attempts:${email}`;
    const count = await this.client.get(key);
    if (!count || parseInt(count) < 5) return 0;
    return this.client.ttl(key);
  }

  /** 登录成功后清除失败计数 */
  async clearLoginAttempts(email: string): Promise<void> {
    await this.client.del(`login_attempts:${email}`);
  }

  /**
   * 获取原始 Redis 客户端（用于高级操作）
   */
  getClient(): Redis {
    return this.client;
  }
}
