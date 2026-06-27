// ===================================================================
// 统一响应 DTO
// ===================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 分页元数据
 */
export class PaginationMeta {
  @ApiProperty({ description: '总条数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页条数' })
  per_page: number;

  @ApiProperty({ description: '总页数' })
  total_pages: number;
}

/**
 * 统一成功响应 — 单对象
 *
 * @example
 * {
 *   "code": 0,
 *   "message": "success",
 *   "data": { "id": 1, "name": "..." }
 * }
 */
export class ApiResponse<T = unknown> {
  @ApiProperty({ description: '业务状态码，0 表示成功', example: 0 })
  code: number;

  @ApiProperty({ description: '提示信息', example: 'success' })
  message: string;

  @ApiPropertyOptional({ description: '响应数据' })
  data?: T;

  constructor(code: number, message: string, data?: T) {
    this.code = code;
    this.message = message;
    this.data = data;
  }

  /** 快速创建成功响应 */
  static success<T>(data: T, message = 'success'): ApiResponse<T> {
    return new ApiResponse(0, message, data);
  }

  /** 快速创建分页成功响应 */
  static paginated<T>(
    items: T[],
    total: number,
    page: number,
    per_page: number,
    message = 'success',
  ): ApiResponse<{
    items: T[];
    pagination: PaginationMeta;
  }> {
    return new ApiResponse(0, message, {
      items,
      pagination: {
        total,
        page,
        per_page,
        total_pages: Math.ceil(total / per_page),
      },
    });
  }

  /** 快速创建错误响应 */
  static error(code: number, message: string, errors?: unknown[]): ApiResponse<null> {
    const response = new ApiResponse<null>(code, message, null);
    (response as unknown as Record<string, unknown>).errors = errors;
    return response;
  }
}
