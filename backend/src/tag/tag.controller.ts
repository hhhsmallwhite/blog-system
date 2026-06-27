// ===================================================================
// TagController — 标签控制器
// ===================================================================

import {
  Controller,
  Get,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TagService } from './tag.service';

/**
 * TagController — 标签模块控制器
 *
 * 3 个端点：
 * - GET /tags              查询所有标签
 * - GET /tags/user/:username  查询用户使用的标签
 * - GET /tags/:slug/articles  查询标签下的文章
 */
@ApiTags('Tag — 标签')
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  /**
   * 查询所有标签
   * GET /api/v1/tags
   */
  @Get()
  @ApiOperation({ summary: '查询所有标签', description: '按使用次数降序排列' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: '每页数量' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
  ) {
    const data = await this.tagService.findAll(page, pageSize);
    return { code: 0, message: 'success', data };
  }

  /**
   * 查询某用户使用过的标签
   * GET /api/v1/tags/user/:username
   */
  @Get('user/:username')
  @ApiOperation({ summary: '查询用户标签', description: '获取某用户文章中使用过的标签' })
  async findByUser(@Param('username') username: string) {
    const data = await this.tagService.findByUser(username);
    return { code: 0, message: 'success', data };
  }

  /**
   * 查询标签下的已发布文章
   * GET /api/v1/tags/:slug/articles
   */
  @Get(':slug/articles')
  @ApiOperation({ summary: '查询标签下的文章', description: '读者端：获取某标签下的已发布文章' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findArticlesByTag(
    @Param('slug') slug: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
  ) {
    const data = await this.tagService.findArticlesByTag(slug, page, pageSize);
    return { code: 0, message: 'success', data };
  }
}
