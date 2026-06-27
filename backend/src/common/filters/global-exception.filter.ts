// ===================================================================
// 全局异常过滤器 — 统一错误响应格式
// ===================================================================

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 错误码映射 — 7 类错误
 */
const ERROR_CODE_MAP: Record<number, number> = {
  // 400 — 参数校验错误
  [HttpStatus.BAD_REQUEST]: 40000,
  // 401 — 未认证
  [HttpStatus.UNAUTHORIZED]: 40100,
  // 403 — 无权限
  [HttpStatus.FORBIDDEN]: 40300,
  // 404 — 资源不存在
  [HttpStatus.NOT_FOUND]: 40400,
  // 409 — 资源冲突
  [HttpStatus.CONFLICT]: 40900,
  // 422 — 请求体校验错误
  [HttpStatus.UNPROCESSABLE_ENTITY]: 42200,
  // 429 — 请求频率超限
  [HttpStatus.TOO_MANY_REQUESTS]: 42900,
};

/**
 * 捕获所有未处理的异常，转换为统一响应格式:
 *
 * {
 *   "code": errorCode,
 *   "message": "错误描述",
 *   "errors": [{ "field": "email", "message": "邮箱格式不正确" }]
 * }
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let code: number;
    let message: string;
    let errors: unknown[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // 映射错误码
      code = ERROR_CODE_MAP[status] || status * 100;

      // 提取校验错误详情
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;

        // class-validator 校验错误 — 转换为结构化 errors 数组
        if (Array.isArray(resp.message)) {
          if (resp.message.length > 0 && typeof resp.message[0] === 'string') {
            errors = resp.message.map((msg: string) => ({
              field: 'general',
              message: msg,
            }));
          }
        }
      } else {
        message = String(exceptionResponse);
      }
    } else {
      // 未预期的内部错误
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 50000;
      message = '服务器内部错误';

      // 记录详细错误日志
      this.logger.error(
        `未处理异常: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // 401/403 记录安全日志
    if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      this.logger.warn(
        `${status === 401 ? '未认证' : '无权限'}: ${request.method} ${request.url} - IP: ${request.ip}`,
      );
    }

    // 5xx 记录错误日志
    if (status >= 500) {
      this.logger.error(
        `服务器错误 [${status}]: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      code,
      message,
      ...(errors ? { errors } : {}),
    });
  }
}
