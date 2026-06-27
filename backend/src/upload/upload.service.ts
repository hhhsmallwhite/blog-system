// ===================================================================
// UploadService — 文件上传业务逻辑
// ===================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

/** 允许的图片 MIME 类型 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

/** 图片 magic bytes 签名 */
const MAGIC_BYTES: Record<string, Buffer> = {
  'image/jpeg': Buffer.from([0xff, 0xd8, 0xff]),
  'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  'image/gif': Buffer.from([0x47, 0x49, 0x46, 0x38]),
  'image/webp': Buffer.from([0x52, 0x49, 0x46, 0x46]), // RIFF
};

/** 最大文件大小 5MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** 上传目录 */
const UPLOAD_DIR = 'uploads';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
  }

  /**
   * 上传图片文件
   */
  async uploadImage(file: Express.Multer.File, userId: number) {
    if (!file) throw new BadRequestException('文件不能为空');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('文件大小不能超过 5MB');
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`不支持的文件类型: ${file.mimetype}，仅支持 JPG/PNG/GIF/WebP`);
    }

    // 校验 magic bytes
    this.validateMagicBytes(file.buffer, file.mimetype);

    // 生成存储路径
    const ext = path.extname(file.originalname) || this.getExtByMime(file.mimetype);
    const hash = crypto.createHash('md5').update(file.buffer).digest('hex');
    const dateDir = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const storageKey = `${dateDir}/${hash}${ext}`;
    const absolutePath = path.join(UPLOAD_DIR, storageKey);

    // 写入文件
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.buffer);

    // 生成访问 URL
    const url = `${this.baseUrl}/${UPLOAD_DIR}/${storageKey}`.replace(/\\/g, '/');

    // 写入数据库
    const upload = await this.prisma.upload.create({
      data: {
        userId,
        originalName: file.originalname,
        storageKey,
        url,
        mimeType: file.mimetype,
        fileSize: file.size,
        type: 'image',
      },
    });

    this.logger.log(`文件上传成功: ${storageKey} (${file.size} bytes)`);

    return {
      id: upload.id,
      url: upload.url,
      storageKey: upload.storageKey,
      originalName: upload.originalName,
      fileSize: upload.fileSize,
      mimeType: upload.mimeType,
    };
  }

  /**
   * 查询当前用户的媒体库
   */
  async findMyUploads(userId: number, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [uploads, total] = await Promise.all([
      this.prisma.upload.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          url: true,
          storageKey: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          createdAt: true,
        },
      }),
      this.prisma.upload.count({
        where: { userId, deletedAt: null },
      }),
    ]);

    return { list: uploads, total, page, pageSize };
  }

  /**
   * 删除上传文件（软删除）
   */
  async remove(userId: number, id: number) {
    const upload = await this.prisma.upload.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!upload) {
      throw new NotFoundException('文件不存在');
    }

    await this.prisma.upload.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: '文件已删除' };
  }

  /**
   * 校验 magic bytes
   */
  private validateMagicBytes(buffer: Buffer, mimeType: string): void {
    const signature = MAGIC_BYTES[mimeType];
    if (!signature) return;

    const header = buffer.subarray(0, signature.length);
    if (!header.equals(signature)) {
      throw new BadRequestException('文件内容与声明类型不匹配');
    }
  }

  /**
   * 根据 MIME 类型获取扩展名
   */
  private getExtByMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    return map[mime] || '.bin';
  }
}
