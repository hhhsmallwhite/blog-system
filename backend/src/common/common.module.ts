// ===================================================================
// 通用模块 — 全局提供的组件（无需手动导入）
// ===================================================================

import { Global, Module } from '@nestjs/common';

/**
 * @Global 装饰器使该模块在全局作用域可用
 *
 * 包含:
 * - GlobalExceptionFilter — 全局异常处理
 * - ResponseInterceptor — 响应包装
 * - LoggingInterceptor — 请求日志
 * - PaginationDto / ApiResponse — 通用 DTO 基类
 *
 * 注意: 过滤器和拦截器的注册在 main.ts 的 bootstrap() 中完成,
 * 这里仅声明模型为 Global 以确保 DI 可见性。
 */
@Global()
@Module({
  providers: [],
  exports: [],
})
export class CommonModule {}
