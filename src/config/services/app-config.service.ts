import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../env.validation';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  get nodeEnv(): EnvConfig['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get apiPrefix(): string {
    return this.config.get('API_PREFIX', { infer: true });
  }

  /** Used to build links embedded in emails (verify-email, reset-password). */
  get frontendUrl(): string {
    return this.config.get('FRONTEND_URL', { infer: true });
  }

  get corsOrigins(): string[] {
    return this.config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get logLevel(): EnvConfig['LOG_LEVEL'] {
    return this.config.get('LOG_LEVEL', { infer: true });
  }
}
