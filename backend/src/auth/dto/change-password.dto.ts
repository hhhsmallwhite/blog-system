import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * ChangePasswordDto — 修改密码请求（已登录用户）
 */
export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123', description: '当前密码' })
  @IsString({ message: '当前密码必须为字符串' })
  old_password: string;

  @ApiProperty({ example: 'NewPassword456', description: '新密码（≥8位，含字母+数字）' })
  @IsString({ message: '新密码必须为字符串' })
  @MinLength(8, { message: '密码至少 8 位' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: '密码必须包含字母和数字',
  })
  new_password: string;
}
