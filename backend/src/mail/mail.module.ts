import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * MailModule — 全局邮件模块
 *
 * 提供验证邮件和密码重置邮件的发送能力。
 * MVP 阶段使用 nodemailer 直接发送，后续版本升级为 RabbitMQ 异步消费。
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
