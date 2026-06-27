import { SetMetadata } from '@nestjs/common';

/** 角色装饰器的元数据 key */
export const ROLES_KEY = 'roles';

/**
 * @Roles 装饰器 — 指定访问路由所需角色
 *
 * 用法:
 *   @Roles('admin')
 *   @Roles('admin', 'super_admin')
 *
 * 需要配合 RolesGuard 使用:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
