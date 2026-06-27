import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from './jwt.strategy';

/**
 * JwtRefreshStrategy — Refresh Token 验证策略
 *
 * 从 HttpOnly Cookie (refresh_token) 中提取 Refresh Token，
 * 验证 JWT 签名和有效期，并检查数据库中是否被撤销。
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  private readonly logger = new Logger(JwtRefreshStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  /**
   * 从 Cookie 中提取 refresh_token 并验证
   */
  async validate(req: Request): Promise<JwtPayload & { refreshToken: string }> {
    const token = req.cookies?.refresh_token;

    if (!token) {
      throw new UnauthorizedException('缺少 Refresh Token');
    }

    // 验证 JWT 签名和有效期
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(
        token,
        this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      ) as unknown as JwtPayload;
    } catch (error) {
      this.logger.warn(`Refresh Token JWT 验证失败: ${(error as Error).message}`);
      throw new UnauthorizedException('Refresh Token 无效或已过期');
    }

    // 查出用户状态
    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, status: true },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('账号已被冻结或删除');
    }

    // 检查数据库中该 token 是否被撤销
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        token,
        userId: decoded.sub,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh Token 已被撤销或过期');
    }

    return { ...decoded, refreshToken: token };
  }
}
