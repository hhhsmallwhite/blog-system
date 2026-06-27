import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule — 全局数据库模块
 *
 * 使用 @Global() 装饰器，使 PrismaService 在整个应用中无需重复导入即可使用。
 * 所有需要数据库访问的模块直接通过依赖注入获取 PrismaService。
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
