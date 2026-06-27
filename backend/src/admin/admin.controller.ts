// ===================================================================
// AdminController — 管理后台控制器
// ===================================================================

import {
  Controller, Get, Post, Delete, Param, Query, Body, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin — 管理后台')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: '仪表盘统计' })
  async getStats() {
    const data = await this.adminService.getStats();
    return { code: 0, message: 'success', data };
  }

  @Get('articles')
  @ApiOperation({ summary: '管理端文章列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getArticles(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: string,
  ) {
    const data = await this.adminService.getArticles(page || 1, pageSize || 10, status);
    return { code: 0, message: 'success', data };
  }

  @Get('comments')
  @ApiOperation({ summary: '管理端评论列表' })
  async getComments(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: string,
  ) {
    const data = await this.adminService.getComments(page || 1, pageSize || 10, status);
    return { code: 0, message: 'success', data };
  }

  @Post('comments/:id/review')
  @ApiOperation({ summary: '审核评论' })
  async reviewComment(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.reviewComment(id);
    return { code: 0, message: '评论已审核', data: null };
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: '删除评论' })
  async deleteComment(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.deleteComment(id);
    return { code: 0, message: '评论已删除', data: null };
  }

  @Get('users')
  @ApiOperation({ summary: '用户列表' })
  async getUsers(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    const data = await this.adminService.getUsers(page || 1, pageSize || 10);
    return { code: 0, message: 'success', data };
  }

  @Post('users/:id/freeze')
  @ApiOperation({ summary: '冻结/解冻用户' })
  async toggleFreeze(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.toggleFreeze(id);
    return { code: 0, message: '用户状态已更新', data: null };
  }

  @Post('users/:id/role')
  @ApiOperation({ summary: '修改用户角色' })
  async updateRole(@Param('id', ParseIntPipe) id: number, @Body('roleId') roleId: number) {
    await this.adminService.updateRole(id, roleId);
    return { code: 0, message: '角色已更新', data: null };
  }
}
