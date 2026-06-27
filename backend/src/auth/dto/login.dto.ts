import { IsEmail, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * LoginDto — 用户登录请求
 */
export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: '邮箱地址' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ example: 'Password123', description: '密码' })
  @IsString({ message: '密码必须为字符串' })
  password: string;

  @ApiPropertyOptional({ example: false, description: '延长 Refresh Token 有效期至 30 天' })
  @IsBoolean({ message: 'remember_me 必须为布尔值' })
  @IsOptional()
  remember_me?: boolean;
}
