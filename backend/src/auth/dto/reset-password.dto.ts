import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * ResetPasswordDto — 重置密码请求
 */
export class ResetPasswordDto {
  @ApiProperty({ example: 'reset_token_xyz789', description: '重置邮件中的 Token' })
  @IsString({ message: 'Token 必须为字符串' })
  token: string;

  @ApiProperty({ example: 'NewPassword123', description: '新密码（≥8位，含字母+数字）' })
  @IsString({ message: '密码必须为字符串' })
  @MinLength(8, { message: '密码至少 8 位' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: '密码必须包含字母和数字',
  })
  password: string;
}
