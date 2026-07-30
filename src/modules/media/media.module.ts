import * as path from 'node:path';
import * as fs from 'node:fs';
import { Module, OnModuleInit } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaRepository } from './media.repository';
import { UploadConfigService } from '../../config/services/upload-config.service';
import { UPLOAD_SUBDIRECTORIES } from './media.constants';

@Module({
  controllers: [MediaController],
  providers: [MediaService, MediaRepository],
  exports: [MediaService],
})
export class MediaModule implements OnModuleInit {
  constructor(private readonly uploadConfig: UploadConfigService) {}

  // Self-heals a fresh checkout or a wiped upload path — docs/12-UPLOAD-SYSTEM.md §1.
  onModuleInit(): void {
    for (const dir of UPLOAD_SUBDIRECTORIES) {
      fs.mkdirSync(path.join(this.uploadConfig.rootPath, dir), {
        recursive: true,
      });
    }
  }
}
