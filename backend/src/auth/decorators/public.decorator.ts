import { SetMetadata } from '@nestjs/common';

/** 公开路由装饰器的元数据 key */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public 装饰器 — 标记路由无需 JWT 认证
 *
 * 配合 JwtAuthGuard 使用，跳过认证检查。
 * 用法:
 *   @Public()
 *   @Post('register')
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
