import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * 邮件任务数据结构
 * 通过 RabbitMQ 队列传递
 */
export interface MailTask {
  to: string;
  subject: string;
  html: string;
}

/**
 * MailService — 邮件发送服务
 *
 * 基于 nodemailer + SMTP 发送邮件。
 * MVP 阶段直接同步发送（后续 v1.2 升级为 RabbitMQ 异步消费）。
 *
 * 支持的邮件类型:
 * - 邮箱验证邮件（含验证链接）
 * - 密码重置邮件（含重置链接）
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = configService.get<string>('SMTP_HOST', 'smtp.example.com');
    const port = configService.get<number>('SMTP_PORT', 587);
    const user = configService.get<string>('SMTP_USER', '');
    const pass = configService.get<string>('SMTP_PASS', '');

    this.from = configService.get<string>('SMTP_FROM', 'noreply@blog.local');

    // 仅在配置了 SMTP 时创建 transporter
    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`邮件服务已初始化 (${host}:${port})`);
    } else {
      this.logger.warn('SMTP 未配置，邮件发送将仅记录日志（开发模式）');
    }
  }

  /**
   * 发送邮箱验证邮件
   * @param email 收件人邮箱
   * @param token 验证 Token
   * @param username 用户名（用于个性化问候）
   */
  async sendVerificationEmail(email: string, token: string, username: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:5173');
    const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

    const html = `
      <div style="max-width:600px; margin:0 auto; padding:20px; font-family:Arial,sans-serif;">
        <h2 style="color:#2563EB;">欢迎加入博客系统！</h2>
        <p>你好 <strong>${username}</strong>，</p>
        <p>感谢注册博客系统。请点击下方按钮验证你的邮箱地址：</p>
        <div style="text-align:center; margin:30px 0;">
          <a href="${verifyUrl}" style="background:#2563EB; color:#fff; padding:12px 32px;
             text-decoration:none; border-radius:8px; font-size:16px; display:inline-block;">
            验证邮箱
          </a>
        </div>
        <p style="color:#6B7280; font-size:14px;">此链接 1 小时内有效。如果你未注册此账号，请忽略此邮件。</p>
        <hr style="border-color:#E5E7EB; margin:20px 0;">
        <p style="color:#9CA3AF; font-size:12px;">Blog System — 个人创作者博客平台</p>
      </div>
    `;

    await this.send({ to: email, subject: '验证你的邮箱 — 博客系统', html });
  }

  /**
   * 发送密码重置邮件
   * @param email 收件人邮箱
   * @param token 重置 Token
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:5173');
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const html = `
      <div style="max-width:600px; margin:0 auto; padding:20px; font-family:Arial,sans-serif;">
        <h2 style="color:#2563EB;">重置你的密码</h2>
        <p>我们收到了你的密码重置请求。请点击下方按钮设置新密码：</p>
        <div style="text-align:center; margin:30px 0;">
          <a href="${resetUrl}" style="background:#2563EB; color:#fff; padding:12px 32px;
             text-decoration:none; border-radius:8px; font-size:16px; display:inline-block;">
            重置密码
          </a>
        </div>
        <p style="color:#6B7280; font-size:14px;">此链接 1 小时内有效。如果你未请求重置密码，请忽略此邮件。</p>
        <hr style="border-color:#E5E7EB; margin:20px 0;">
        <p style="color:#9CA3AF; font-size:12px;">Blog System — 个人创作者博客平台</p>
      </div>
    `;

    await this.send({ to: email, subject: '重置你的密码 — 博客系统', html });
  }

  /**
   * 执行邮件发送
   * 如果 SMTP 未配置（开发模式），仅记录日志不实际发送
   */
  private async send(task: MailTask): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[DEV] 邮件日志:\n  To: ${task.to}\n  Subject: ${task.subject}`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: task.to,
        subject: task.subject,
        html: task.html,
      });
      this.logger.log(`邮件已发送: ${info.messageId} → ${task.to}`);
    } catch (error) {
      // 邮件发送失败不阻塞业务流程，记录错误即可
      this.logger.error(`邮件发送失败 → ${task.to}: ${(error as Error).message}`);
    }
  }
}
