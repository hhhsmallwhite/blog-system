// ===================================================================
// CategoryController — 分类控制器
// ===================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

/**
 * CategoryController — 分类模块控制器
 *
 * 5 个端点：
 * - POST   /categories          创建分类
 * - GET    /categories          查询当前用户分类列表
 * - GET    /categories/:id      查询单个分类
 * - PATCH  /categories/:id      更新分类
 * - DELETE /categories/:id      删除分类
 * - GET    /categories/public/:username  读者端查询公开分类
 */
@ApiTags('Category — 分类')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  /**
   * 创建分类
   * POST /api/v1/categories
   */
  @Post()
  @ApiOperation({ summary: '创建分类', description: '创建一个新分类（按用户隔离）' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 409, description: '分类名称或 slug 已存在' })
  async create(
    @CurrentUser() user: { sub: number },
    @Body() dto: CreateCategoryDto,
  ) {
    const data = await this.categoryService.create(user.sub, dto);
    return { code: 0, message: '分类创建成功', data };
  }

  /**
   * 查询当前用户的所有分类
   * GET /api/v1/categories
   */
  @Get()
  @ApiOperation({ summary: '查询分类列表', description: '获取当前用户的所有分类（树形结构）' })
  async findAll(@CurrentUser() user: { sub: number }) {
    const data = await this.categoryService.findAllByUser(user.sub);
    return { code: 0, message: 'success', data };
  }

  /**
   * 查询单个分类
   * GET /api/v1/categories/:id
   */
  @Get(':id')
  @ApiOperation({ summary: '查询单个分类' })
  async findOne(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.categoryService.findOne(user.sub, id);
    return { code: 0, message: 'success', data };
  }

  /**
   * 更新分类
   * PATCH /api/v1/categories/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: '更新分类' })
  async update(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    const data = await this.categoryService.update(user.sub, id, dto);
    return { code: 0, message: '分类更新成功', data };
  }

  /**
   * 删除分类（软删除）
   * DELETE /api/v1/categories/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除分类', description: '软删除分类，关联文章的 categoryId 设为 null' })
  async remove(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.categoryService.remove(user.sub, id);
    return { code: 0, message: data.message, data: null };
  }

  /**
   * 读者端：查询某用户的公开分类
   * GET /api/v1/categories/public/:username
   */
  @Public()
  @Get('public/:username')
  @ApiOperation({ summary: '读者端查询公开分类', description: '获取有已发布文章的分类列表' })
  async findPublicCategories(@Param('username') username: string) {
    const data = await this.categoryService.findPublicCategories(username);
    return { code: 0, message: 'success', data };
  }
}
