import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../env.validation';

@Injectable()
export class RazorpayConfigService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  get keyId(): string {
    return this.config.get('RAZORPAY_KEY_ID', { infer: true });
  }

  get keySecret(): string {
    return this.config.get('RAZORPAY_KEY_SECRET', { infer: true });
  }

  get webhookSecret(): string {
    return this.config.get('RAZORPAY_WEBHOOK_SECRET', { infer: true });
  }

  get isConfigured(): boolean {
    return this.keyId.length > 0 && this.keySecret.length > 0;
  }
}
