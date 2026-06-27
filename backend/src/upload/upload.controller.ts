// ===================================================================
// UploadController — 文件上传控制器
// ===================================================================

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QueryUploadsDto } from './dto/query-uploads.dto';

/**
 * UploadController — 文件上传模块控制器
 *
 * 3 个端点：
 * - POST   /uploads        上传图片
 * - GET    /uploads        查询媒体库
 * - DELETE /uploads/:id    删除文件
 */
@ApiTags('Upload — 文件上传')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * 上传图片
   * POST /api/v1/uploads
   * multipart/form-data: file=<图片文件>
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '图片文件（JPG/PNG/GIF/WebP，最大 5MB）',
        },
      },
    },
  })
  @ApiOperation({ summary: '上传图片', description: '上传图片文件，返回访问 URL' })
  @ApiResponse({ status: 201, description: '上传成功' })
  @ApiResponse({ status: 400, description: '文件校验失败' })
  async upload(
    @CurrentUser() user: { sub: number },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.uploadService.uploadImage(file, user.sub);
    return { code: 0, message: '上传成功', data };
  }

  /**
   * 查询媒体库
   * GET /api/v1/uploads
   */
  @Get()
  @ApiOperation({ summary: '查询媒体库', description: '获取当前用户上传的文件列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findAll(
    @CurrentUser() user: { sub: number },
    @Query() query: QueryUploadsDto,
  ) {
    const data = await this.uploadService.findMyUploads(
      user.sub,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
    return { code: 0, message: 'success', data };
  }

  /**
   * 删除文件
   * DELETE /api/v1/uploads/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除文件', description: '软删除上传的文件' })
  async remove(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.uploadService.remove(user.sub, id);
    return { code: 0, message: data.message, data: null };
  }
}
