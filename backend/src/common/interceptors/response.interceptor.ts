// ===================================================================
// 响应拦截器 — 统一包装成功响应
// ===================================================================

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../dto/response.dto';

/**
 * 自动将 Controller 返回的数据包装为统一响应格式:
 *
 * {
 *   "code": 0,
 *   "message": "success",
 *   "data": <原始返回数据>
 * }
 *
 * 如果返回的是 ApiResponse 实例，则直接透传（不重复包装）。
 * 对于 204 No Content 响应，不包装。
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data: T): ApiResponse<T> => {
        // 已经是 ApiResponse 实例，直接透传
        if (data instanceof ApiResponse) {
          return data;
        }

        // 204 No Content — 不包装
        if (response.statusCode === 204) {
          return data as unknown as ApiResponse<T>;
        }

        // 包装为统一格式
        return ApiResponse.success(data);
      }),
    );
  }
}
