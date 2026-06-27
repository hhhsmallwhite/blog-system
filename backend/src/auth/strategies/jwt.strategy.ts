import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * JWT Payload 结构
 * 签发 access_token 时写入的字段
 */
export interface JwtPayload {
  sub: number;       // 用户 ID
  email: string;     // 邮箱
  username: string;  // 用户名
  roles: string[];   // 角色列表
}

/**
 * JwtStrategy — Access Token 验证策略
 *
 * 从 Authorization: Bearer <token> 头部提取 JWT，
 * 验证签名和有效期后，将 payload 挂载到 request.user。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * 验证 JWT payload 并附加用户信息
   * Passport 会自动调用此方法，返回值挂载到 request.user
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // 验证用户是否存在且状态正常
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true },
    });

    if (!user) {
      this.logger.warn(`JWT 验证失败: 用户不存在 id=${payload.sub}`);
      throw new UnauthorizedException('用户不存在');
    }

    if (user.status === 'suspended' || user.status === 'deleted') {
      this.logger.warn(`JWT 验证失败: 用户已冻结/删除 id=${payload.sub} status=${user.status}`);
      throw new UnauthorizedException('账号已被冻结或删除');
    }

    return payload;
  }
}
