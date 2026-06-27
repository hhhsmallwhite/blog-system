// ===================================================================
// HealthController 单元测试
// ===================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';

// Mock PrismaClient before any imports of the controller
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRaw: jest.fn().mockResolvedValue([{ '': 1 }]),
  })),
}));

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  /** 基础存在性检查 */
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  /** 健康检查 — 数据库可用时 */
  it('should return ok status with valid timestamp when DB is reachable', async () => {
    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('connected');
    expect(typeof result.timestamp).toBe('string');
    // 验证是合法 ISO 日期字符串
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  /** 健康检查 — 包含 uptime */
  it('should return uptime in seconds', async () => {
    const result = await controller.check();

    expect(typeof result.uptime).toBe('number');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });

  /** 健康检查 — 数据库不可用 */
  it('should return error status when DB is unreachable', async () => {
    // 模拟数据库查询失败
    const { PrismaClient } = require('@prisma/client');
    PrismaClient.mockImplementationOnce(() => ({
      $queryRaw: jest.fn().mockRejectedValue(new Error('Connection refused')),
    }));

    const failModule = await Test.createTestingModule({
      imports: [PrismaModule],
      controllers: [HealthController],
    }).compile();
    const failController = failModule.get<HealthController>(HealthController);

    const result = await failController.check();

    expect(result.status).toBe('error');
    expect(result.db).toBe('disconnected');
  });
});
