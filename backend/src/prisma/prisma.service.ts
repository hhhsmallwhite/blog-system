import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService — 数据库服务
 *
 * 继承 PrismaClient，实现 NestJS 生命周期钩子：
 * - OnModuleInit: 模块初始化时连接数据库
 * - OnModuleDestroy: 应用关闭时断开连接
 *
 * 通过 @Global() PrismaModule 全局注入，所有业务 Service 可直接依赖注入使用。
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  /**
   * 模块初始化时建立数据库连接
   * 连接失败会抛出异常，由 NestJS 异常处理层捕获
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('数据库连接已建立');
    } catch (error) {
      this.logger.error(`数据库连接失败: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 应用关闭时断开数据库连接
   * 确保所有活跃查询完成后安全断开
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('数据库连接已断开');
  }

  /**
   * 手动检查数据库连通性
   * 用于健康检查端点
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
