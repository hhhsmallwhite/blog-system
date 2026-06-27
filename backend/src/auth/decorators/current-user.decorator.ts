import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../strategies/jwt.strategy';

/**
 * @CurrentUser 装饰器 — 从请求中提取当前登录用户信息
 *
 * 用法（取完整 payload）:
 *   @CurrentUser() user: JwtPayload
 *
 * 用法（取特定字段）:
 *   @CurrentUser('sub') userId: number
 *   @CurrentUser('email') email: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | JwtPayload[keyof JwtPayload] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  },
);
