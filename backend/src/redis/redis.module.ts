import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * RedisModule — 全局 Redis 缓存模块
 *
 * 使用 @Global() 装饰器，使 RedisService 在整个应用中可用。
 * 提供登录限流、会话管理、缓存等功能。
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
