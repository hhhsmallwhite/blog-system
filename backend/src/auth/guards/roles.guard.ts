import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../strategies/jwt.strategy';

/**
 * RolesGuard — 基于角色的访问控制
 *
 * 在 JwtAuthGuard 之后执行，读取 @Roles() 装饰器指定的角色要求。
 * 用户必须至少拥有一个所需角色才能访问。
 *
 * 路由示例:
 *   @Roles('admin', 'super_admin')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 没有 @Roles() 装饰器 → 不限制
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user || !user.roles) {
      this.logger.warn('RolesGuard: 用户未认证或无角色信息');
      throw new ForbiddenException('权限不足');
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      this.logger.warn(
        `RolesGuard: 用户 ${user.email} 角色 ${user.roles.join(',')} 不满足所需 ${requiredRoles.join(',')}`,
      );
      throw new ForbiddenException('权限不足');
    }

    return true;
  }
}
