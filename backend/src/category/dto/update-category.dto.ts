// ===================================================================
// 更新分类 DTO
// ===================================================================

import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

/**
 * 更新分类 DTO
 *
 * 所有字段可选，通过 PartialType 继承 CreateCategoryDto。
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
