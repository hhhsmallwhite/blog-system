import { IsEmail, IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * RegisterDto — 用户注册请求
 *
 * 校验规则:
 * - email: 有效邮箱格式，5-255 字符
 * - password: ≥8 位，必须包含字母和数字
 * - username: 3-20 位，仅允许字母、数字、下划线
 */
export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: '邮箱地址' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(255, { message: '邮箱不能超过 255 字符' })
  email: string;

  @ApiProperty({ example: 'Password123', description: '密码（≥8位，含字母+数字）' })
  @IsString({ message: '密码必须为字符串' })
  @MinLength(8, { message: '密码至少 8 位' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: '密码必须包含字母和数字',
  })
  password: string;

  @ApiProperty({ example: 'myusername', description: '用户名（3-20位字母数字下划线）' })
  @IsString({ message: '用户名必须为字符串' })
  @Matches(/^[a-zA-Z0-9_]{3,20}$/, {
    message: '用户名须为 3-20 位字母、数字或下划线',
  })
  username: string;
}
