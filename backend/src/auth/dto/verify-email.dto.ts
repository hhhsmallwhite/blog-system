import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * VerifyEmailDto — 邮箱验证请求
 */
export class VerifyEmailDto {
  @ApiProperty({ example: 'verify_token_abc123', description: '验证邮件中的 Token' })
  @IsString({ message: 'Token 必须为字符串' })
  token: string;
}
