import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../env.validation';
import { parseDurationToMs } from '../../utils/duration.util';

@Injectable()
export class JwtConfigService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  get accessPrivateKey(): string {
    return this.unescapeNewlines(
      this.config.get('JWT_ACCESS_PRIVATE_KEY', { infer: true }),
    );
  }

  get accessPublicKey(): string {
    return this.unescapeNewlines(
      this.config.get('JWT_ACCESS_PUBLIC_KEY', { infer: true }),
    );
  }

  /** PEM keys are stored in .env as a single line with literal `\n` — see scripts/generate-jwt-keys.js. */
  private unescapeNewlines(value: string): string {
    return value.replace(/\\n/g, '\n');
  }

  get accessTtl(): string {
    return this.config.get('JWT_ACCESS_TTL', { infer: true });
  }

  /** jsonwebtoken's `expiresIn` accepts a number of seconds or a template-literal duration
   *  string it can't statically verify against our env-sourced string — converting to a
   *  plain number sidesteps that type mismatch entirely. */
  get accessTtlSeconds(): number {
    return Math.floor(parseDurationToMs(this.accessTtl) / 1000);
  }

  get refreshTtl(): string {
    return this.config.get('JWT_REFRESH_TTL', { infer: true });
  }

  get issuer(): string {
    return this.config.get('JWT_ISSUER', { infer: true });
  }
}
