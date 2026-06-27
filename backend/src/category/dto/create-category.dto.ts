// ===================================================================
// 创建分类 DTO
// ===================================================================

import { IsString, IsOptional, IsInt, MaxLength, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 创建分类 DTO
 *
 * 分类按用户隔离，同一用户下分类名和 slug 唯一。
 */
export class CreateCategoryDto {
  @ApiProperty({ description: '分类名称', example: '前端开发', maxLength: 50 })
  @IsString()
  @MinLength(1, { message: '分类名称不能为空' })
  @MaxLength(50, { message: '分类名称不能超过 50 个字符' })
  name: string;

  @ApiPropertyOptional({ description: '分类 slug（URL 友好）', example: 'frontend' })
  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'slug 不能超过 60 个字符' })
  @Matches(/^[a-z0-9-]*$/, { message: 'slug 只能包含小写字母、数字和连字符' })
  slug?: string;

  @ApiPropertyOptional({ description: '分类描述', example: '前端技术相关文章' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '描述不能超过 200 个字符' })
  description?: string;

  @ApiPropertyOptional({ description: '排序权重', example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '父分类 ID（支持层级）', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;
}
