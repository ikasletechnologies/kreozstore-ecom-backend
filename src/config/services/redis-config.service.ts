import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../env.validation';

@Injectable()
export class RedisConfigService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  get host(): string {
    return this.config.get('REDIS_HOST', { infer: true });
  }

  get port(): number {
    return this.config.get('REDIS_PORT', { infer: true });
  }

  get password(): string | undefined {
    const password = this.config.get('REDIS_PASSWORD', { infer: true });
    return password.length > 0 ? password : undefined;
  }
}
