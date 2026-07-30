import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../env.validation';

@Injectable()
export class SecurityConfigService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  get throttleTtlSeconds(): number {
    return this.config.get('THROTTLE_TTL', { infer: true });
  }

  get throttleLimit(): number {
    return this.config.get('THROTTLE_LIMIT', { infer: true });
  }

  get bcryptSaltRounds(): number {
    return this.config.get('BCRYPT_SALT_ROUNDS', { infer: true });
  }
}
