// ===================================================================
// 健康检查 Controller
// ===================================================================

import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

/**
 * GET /api/v1/health
 *
 * 返回应用健康状态:
 * - status: "ok" | "degraded" | "error"
 * - timestamp: ISO 8601 时间戳
 * - uptime: 进程运行秒数
 * - db: "connected" | "disconnected"
 *
 * Docker compose 健康检查会定期调用此端点。
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '健康检查', description: '返回应用和数据库连接状态' })
  async check(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    db: string;
  }> {
    let dbStatus = 'disconnected';
    let overallStatus = 'degraded';

    try {
      // 使用原始查询检查数据库连接
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
      overallStatus = 'ok';
    } catch (error) {
      this.logger.error(
        `数据库健康检查失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      overallStatus = 'error';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      db: dbStatus,
    };
  }
}
