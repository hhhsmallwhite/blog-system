// ===================================================================
// 更新文章 DTO
// ===================================================================

import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateArticleDto } from './create-article.dto';

/**
 * 更新文章 DTO
 *
 * 继承 CreateArticleDto 的所有字段（可选），排除 content（内容通过 autosave 更新）
 */
export class UpdateArticleDto extends PartialType(
  OmitType(CreateArticleDto, ['content'] as const),
) {}
