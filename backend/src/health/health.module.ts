// ===================================================================
// 健康检查模块
// ===================================================================

import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

/**
 * 提供 GET /api/v1/health 端点
 * 用于 Docker healthcheck 和负载均衡器探测
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
