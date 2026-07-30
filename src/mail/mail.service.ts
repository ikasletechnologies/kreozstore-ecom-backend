import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { MailConfigService } from '../config/services/mail-config.service';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Low-level Nodemailer wrapper — no templates yet (those land in the phase that builds the
 * triggers listed in docs/18-EMAIL-FLOW.md). Every real send goes through the `email` BullMQ
 * queue, not this service directly from a request handler — see docs/17-BULLMQ-DESIGN.md.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly mailConfig: MailConfigService) {}

  onModuleInit(): void {
    if (!this.mailConfig.isConfigured) {
      this.logger.warn(
        'SMTP_HOST is not set — MailService will log instead of sending.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.mailConfig.host,
      port: this.mailConfig.port,
      secure: this.mailConfig.secure,
      auth: this.mailConfig.user
        ? { user: this.mailConfig.user, pass: this.mailConfig.pass }
        : undefined,
    });
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    if (!this.transporter) {
      const link = /href="([^"]+)"/.exec(options.html)?.[1];
      this.logger.warn(
        `SMTP not configured — not sending "${options.subject}" to ${options.to}.` +
          (link ? ` Link: ${link}` : ` Body:\n${options.html}`),
      );
      return;
    }

    await this.transporter.sendMail({
      from: `"${this.mailConfig.fromName}" <${this.mailConfig.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }

  /** Used by the health check when SMTP is configured. */
  async verifyConnection(): Promise<void> {
    if (!this.transporter) return;
    await this.transporter.verify();
  }
}
