import { Controller, Get, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * UserController — 用户模块控制器
 *
 * 4 个端点：
 * - GET /users/me — 当前用户资料
 * - PATCH /users/me — 更新个人资料
 * - GET /users/{username} — 用户公开主页
 * - GET /users/{username}/articles — 用户文章列表（公开）
 */
@ApiTags('User — 用户')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取当前用户完整资料
   * GET /api/v1/users/me
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '获取当前用户信息', description: '返回登录用户的完整资料（含 email、roles 等）' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getMe(@CurrentUser('sub') userId: number) {
    const data = await this.userService.getMe(userId);
    return { code: 0, message: 'success', data };
  }

  /**
   * 更新当前用户资料
   * PATCH /api/v1/users/me
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '更新用户资料', description: '更新博客名称/简介/头像/社交链接（PATCH 语义）' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async updateMe(
    @CurrentUser('sub') userId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    const data = await this.userService.updateMe(userId, dto);
    return { code: 0, message: '资料更新成功', data };
  }

  /**
   * 获取用户公开主页
   * GET /api/v1/users/{username}
   */
  @Get(':username')
  @ApiOperation({ summary: '获取用户公开主页', description: '按用户名查询公开资料（不含敏感信息）' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getUserByUsername(@Param('username') username: string) {
    const data = await this.userService.getUserByUsername(username);
    return { code: 0, message: 'success', data };
  }

  /**
   * 获取用户文章列表（读者端）
   * GET /api/v1/users/{username}/articles
   */
  @Get(':username/articles')
  @ApiOperation({ summary: '获取用户文章列表', description: '按用户名查询已发布文章（公开）' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getUserArticles(
    @Param('username') username: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const pp = Math.min(50, Math.max(1, parseInt(perPage || '10', 10) || 10));
    const data = await this.userService.getUserArticles(username, p, pp);
    return { code: 0, message: 'success', data };
  }
}
