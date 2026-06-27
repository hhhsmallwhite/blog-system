// ===================================================================
// 日志拦截器 — 记录每个请求的方法、URL、状态码和耗时
// ===================================================================

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * 记录每个 HTTP 请求的:
 * - 方法 (GET/POST/...)
 * - URL 路径
 * - 响应状态码
 * - 处理耗时 (ms)
 *
 * 示例日志:
 *   [HTTP] GET /api/v1/articles 200 23ms
 *   [HTTP] POST /api/v1/auth/login 201 87ms
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          const duration = Date.now() - startTime;

          this.logger.log(`${method} ${url} ${statusCode} ${duration}ms`);
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;

          this.logger.error(
            `${method} ${url} - ${error.message} (${duration}ms)`,
          );
        },
      }),
    );
  }
}
