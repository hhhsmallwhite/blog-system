import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * ForgotPasswordDto — 忘记密码请求
 */
export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: '注册邮箱' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;
}
