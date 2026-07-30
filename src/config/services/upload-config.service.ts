import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../env.validation';

@Injectable()
export class UploadConfigService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  get rootPath(): string {
    return this.config.get('UPLOAD_ROOT_PATH', { infer: true });
  }

  get maxImageSizeBytes(): number {
    return (
      this.config.get('UPLOAD_MAX_IMAGE_SIZE_MB', { infer: true }) * 1024 * 1024
    );
  }

  get maxDocSizeBytes(): number {
    return (
      this.config.get('UPLOAD_MAX_DOC_SIZE_MB', { infer: true }) * 1024 * 1024
    );
  }
}
