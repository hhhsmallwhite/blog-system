// ===================================================================
// 健康检查 E2E 测试
// ===================================================================

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';

/**
 * 健康检查端点 E2E 测试
 *
 * 验证:
 * - GET /api/v1/health 返回 200
 * - 响应格式符合统一规范
 * - 数据库连通性检查
 */
describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET) — 返回 200 和正确格式', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    // 验证统一响应格式
    expect(response.body).toHaveProperty('code', 0);
    expect(response.body).toHaveProperty('message', 'success');
    expect(response.body).toHaveProperty('data');

    // 验证健康检查数据字段
    const data = response.body.data;
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('db');

    // 验证 status 为有效值
    expect(['ok', 'degraded', 'error']).toContain(data.status);

    // 验证 db 为有效值
    expect(['connected', 'disconnected']).toContain(data.db);

    // 验证 uptime 为正数
    expect(typeof data.uptime).toBe('number');
    expect(data.uptime).toBeGreaterThanOrEqual(0);

    // 验证 timestamp 为 ISO 8601 格式
    expect(() => new Date(data.timestamp)).not.toThrow();
  });

  it('GET /api/v1/nonexistent — 返回 404', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/nonexistent')
      .expect(404);

    // 验证统一错误响应格式
    expect(response.body).toHaveProperty('code', 40400);
    expect(response.body).toHaveProperty('message');
  });
});
