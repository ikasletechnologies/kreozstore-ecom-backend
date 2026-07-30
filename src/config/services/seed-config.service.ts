import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../env.validation';

@Injectable()
export class SeedConfigService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  get superAdminEmail(): string {
    return this.config.get('SEED_SUPER_ADMIN_EMAIL', { infer: true });
  }
}
