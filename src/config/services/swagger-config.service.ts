import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../env.validation';

@Injectable()
export class SwaggerConfigService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  get enabled(): boolean {
    return this.config.get('SWAGGER_ENABLED', { infer: true });
  }

  get path(): string {
    return this.config.get('SWAGGER_PATH', { infer: true });
  }
}
