import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

/**
 * UserModule — 用户模块
 *
 * 提供用户资料读写、公开主页查询、文章列表查询等功能。
 * PrismaService 通过全局 PrismaModule 注入。
 */
@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
