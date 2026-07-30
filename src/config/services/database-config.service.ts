import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../env.validation';

@Injectable()
export class DatabaseConfigService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  get url(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }
}
