import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

/**
 * JwtAuthGuard — JWT 认证守卫
 *
 * 继承 Passport 的 AuthGuard('jwt')，自动调用 JwtStrategy.validate()。
 * 验证通过后 request.user 包含 JwtPayload。
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * 检查是否需要认证
   * 支持 @Public() 装饰器跳过 JWT 验证
   */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
