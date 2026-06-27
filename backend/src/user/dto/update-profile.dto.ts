import { IsString, IsOptional, MaxLength, IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * SocialLinkDto — 社交链接子对象
 */
export class SocialLinkDto {
  @ApiProperty({ example: 'github', description: '平台: github/twitter/weibo/zhihu/linkedin/custom' })
  @IsString()
  platform: string;

  @ApiProperty({ example: 'https://github.com/user', description: '链接 URL' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ example: 'My Site', description: '自定义名称（仅 platform=custom 时有效）' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  display_name?: string;
}

/**
 * UpdateProfileDto — 更新用户资料请求
 *
 * 所有字段均为可选（PATCH 语义），只更新传入的字段。
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '我的技术博客', description: '博客名称（5-50字）' })
  @IsOptional()
  @IsString({ message: 'blog_name 必须为字符串' })
  @MaxLength(50, { message: '博客名称不能超过 50 字' })
  blog_name?: string;

  @ApiPropertyOptional({ example: '后端工程师，专注分布式系统', description: '个人简介（≤200字）' })
  @IsOptional()
  @IsString({ message: 'bio 必须为字符串' })
  @MaxLength(200, { message: '个人简介不能超过 200 字' })
  bio?: string;

  @ApiPropertyOptional({ example: 'https://cdn.blog.com/avatars/1.jpg', description: '头像 URL' })
  @IsOptional()
  @IsString({ message: 'avatar 必须为字符串' })
  avatar?: string;

  @ApiPropertyOptional({
    description: '社交链接数组（最多5个，整体替换）',
    type: [SocialLinkDto],
  })
  @IsOptional()
  @IsArray({ message: 'social_links 必须为数组' })
  @ArrayMaxSize(5, { message: '社交链接最多 5 个' })
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  social_links?: SocialLinkDto[];
}
