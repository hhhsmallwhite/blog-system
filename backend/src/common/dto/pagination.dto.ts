// ===================================================================
// 通用分页请求 DTO
// ===================================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * 分页查询基类
 *
 * 使用方式:
 *   class GetArticlesDto extends PaginationDto { ... }
 *
 * 参数:
 *   page     - 页码（从 1 开始）
 *   per_page - 每页条数（1-50，默认 10）
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: '页码（从 1 开始）',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须为整数' })
  @Min(1, { message: '页码必须 ≥ 1' })
  page: number = 1;

  @ApiPropertyOptional({
    description: '每页条数',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页条数必须为整数' })
  @Min(1, { message: '每页条数必须 ≥ 1' })
  @Max(50, { message: '每页条数必须 ≤ 50' })
  per_page: number = 10;

  /**
   * 获取 Prisma 分页参数
   */
  get skip(): number {
    return (this.page - 1) * this.per_page;
  }

  /**
   * 获取 Prisma 分页参数
   */
  get take(): number {
    return this.per_page;
  }
}
