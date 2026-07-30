import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../env.validation';

@Injectable()
export class MailConfigService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  get host(): string {
    return this.config.get('SMTP_HOST', { infer: true });
  }

  get port(): number {
    return this.config.get('SMTP_PORT', { infer: true });
  }

  get secure(): boolean {
    return this.config.get('SMTP_SECURE', { infer: true });
  }

  get user(): string {
    return this.config.get('SMTP_USER', { infer: true });
  }

  get pass(): string {
    return this.config.get('SMTP_PASS', { infer: true });
  }

  get fromName(): string {
    return this.config.get('SMTP_FROM_NAME', { infer: true });
  }

  get fromEmail(): string {
    return this.config.get('SMTP_FROM_EMAIL', { infer: true });
  }

  get isConfigured(): boolean {
    return this.host.length > 0;
  }
}
