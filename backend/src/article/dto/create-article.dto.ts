// ===================================================================
// 创建文章 DTO
// ===================================================================

import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  MaxLength,
  MinLength,
  IsEnum,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 文章内容类型枚举
 */
export enum ArticleContentType {
  MARKDOWN = 'markdown',
  HTML = 'html',
}

/**
 * 创建文章 DTO
 */
export class CreateArticleDto {
  @ApiProperty({ description: '文章标题', example: '我的第一篇博客' })
  @IsString()
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(200, { message: '标题不能超过 200 个字符' })
  title: string;

  @ApiProperty({ description: '文章内容（Markdown）', example: '# Hello World' })
  @IsString()
  @MinLength(1, { message: '内容不能为空' })
  content: string;

  @ApiPropertyOptional({ description: '摘要', example: '这是一篇关于...' })
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: '摘要不能超过 300 个字符' })
  summary?: string;

  @ApiPropertyOptional({ description: '封面图片 URL', example: 'https://example.com/cover.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @ApiPropertyOptional({ description: '分类 ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ description: '自定义 slug', example: 'my-first-post' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9-]*$/, { message: 'slug 只能包含小写字母、数字和连字符' })
  slug?: string;

  @ApiPropertyOptional({ description: '内容类型', enum: ArticleContentType, default: 'markdown' })
  @IsOptional()
  @IsEnum(ArticleContentType)
  contentType?: ArticleContentType;

  @ApiPropertyOptional({ description: 'SEO 标题', example: 'My First Post' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO 描述', example: 'A blog post about...' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  metaDescription?: string;

  @ApiPropertyOptional({ description: '是否精选', default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: '是否允许评论', default: true })
  @IsOptional()
  @IsBoolean()
  allowComment?: boolean;

  @ApiPropertyOptional({ description: '标签名称列表', example: ['前端', 'React'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
