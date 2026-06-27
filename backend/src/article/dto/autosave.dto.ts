// ===================================================================
// 自动保存 DTO
// ===================================================================

import { IsString, IsOptional, IsInt, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 自动保存 DTO
 *
 * 仅更新标题和内容，用于编辑器定时自动保存。
 */
export class AutosaveDto {
  @ApiProperty({ description: '文章标题' })
  @IsString()
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: '文章内容' })
  @IsString()
  @MinLength(1, { message: '内容不能为空' })
  content: string;

  @ApiPropertyOptional({ description: '文章 ID（新建草稿时为空）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  articleId?: number;
}
