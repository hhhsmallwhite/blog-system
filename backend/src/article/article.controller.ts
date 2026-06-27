// ===================================================================
// ArticleController — 文章控制器
// ===================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { AutosaveDto } from './dto/autosave.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

/**
 * ArticleController — 文章模块控制器
 *
 * 10 个端点：
 * 管理端：
 * - POST   /articles           创建文章（草稿）
 * - GET    /articles           查询我的文章列表
 * - GET    /articles/:id       查询文章详情
 * - PATCH  /articles/:id       更新文章
 * - DELETE /articles/:id       删除文章
 * - POST   /articles/:id/publish     发布文章
 * - POST   /articles/:id/unpublish   取消发布
 * - POST   /articles/autosave  自动保存
 *
 * 读者端：
 * - GET    /articles/slug/:slug      通过 slug 查询已发布文章
 * - GET    /articles/archive/:username  归档数据
 */
@ApiTags('Article — 文章')
@ApiBearerAuth()
@Controller('articles')
@UseGuards(JwtAuthGuard)
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  // ===== 管理端 =====

  /**
   * 创建文章（草稿）
   * POST /api/v1/articles
   */
  @Post()
  @ApiOperation({ summary: '创建文章', description: '创建一篇新文章（默认草稿状态）' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 409, description: 'slug 已存在' })
  async create(
    @CurrentUser() user: { sub: number },
    @Body() dto: CreateArticleDto,
  ) {
    const data = await this.articleService.create(user.sub, dto);
    return { code: 0, message: '文章创建成功', data };
  }

  /**
   * 查询我的文章列表
   * GET /api/v1/articles
   */
  @Get()
  @ApiOperation({ summary: '查询文章列表', description: '获取当前用户的文章列表（含草稿）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'draft / published' })
  async findAll(
    @CurrentUser() user: { sub: number },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
  ) {
    const data = await this.articleService.findAllByAuthor(user.sub, page, pageSize, status);
    return { code: 0, message: 'success', data };
  }

  /**
   * 自动保存
   * POST /api/v1/articles/autosave
   */
  @Post('autosave')
  @ApiOperation({ summary: '自动保存', description: '编辑器定时自动保存草稿' })
  async autosave(
    @CurrentUser() user: { sub: number },
    @Body() dto: AutosaveDto,
  ) {
    const data = await this.articleService.autosave(user.sub, dto);
    return { code: 0, message: '自动保存成功', data };
  }

  /**
   * 查询文章详情（管理端）
   * GET /api/v1/articles/:id
   */
  @Get(':id')
  @ApiOperation({ summary: '查询文章详情', description: '管理端：获取文章完整内容（含草稿）' })
  async findOne(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.articleService.findOneById(user.sub, id);
    return { code: 0, message: 'success', data };
  }

  /**
   * 更新文章
   * PATCH /api/v1/articles/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: '更新文章' })
  async update(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArticleDto,
  ) {
    const data = await this.articleService.update(user.sub, id, dto);
    return { code: 0, message: '文章更新成功', data };
  }

  /**
   * 删除文章（软删除）
   * DELETE /api/v1/articles/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除文章', description: '软删除文章' })
  async remove(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.articleService.remove(user.sub, id);
    return { code: 0, message: data.message, data: null };
  }

  /**
   * 发布文章
   * POST /api/v1/articles/:id/publish
   */
  @Post(':id/publish')
  @ApiOperation({ summary: '发布文章', description: '将草稿状态的文章发布' })
  async publish(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.articleService.publish(user.sub, id);
    return { code: 0, message: '文章发布成功', data };
  }

  /**
   * 取消发布
   * POST /api/v1/articles/:id/unpublish
   */
  @Post(':id/unpublish')
  @ApiOperation({ summary: '取消发布', description: '将已发布文章改回草稿状态' })
  async unpublish(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.articleService.unpublish(user.sub, id);
    return { code: 0, message: '文章已取消发布', data };
  }

  // ===== 读者端 =====

  /**
   * 读者端：通过 slug 查询已发布文章
   * GET /api/v1/articles/slug/:slug
   */
  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: '读者端查询文章', description: '通过 slug 查询已发布文章，自动增加阅读量' })
  async findOneBySlug(@Param('slug') slug: string) {
    const data = await this.articleService.findOneBySlug(slug);
    return { code: 0, message: 'success', data };
  }

  /**
   * 读者端：查询归档数据
   * GET /api/v1/articles/archive/:username
   */
  @Public()
  @Get('archive/:username')
  @ApiOperation({ summary: '归档数据', description: '按年月分组的已发布文章列表' })
  async findArchive(@Param('username') username: string) {
    const data = await this.articleService.findArchive(username);
    return { code: 0, message: 'success', data };
  }
}
