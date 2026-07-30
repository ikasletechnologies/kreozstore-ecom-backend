import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as FileType from 'file-type';
import sharp from 'sharp';
import { UploadConfigService } from '../../config/services/upload-config.service';
import { IMAGE_MIME_TYPES, isUploadableDomain } from './media.constants';
import { MediaRepository, type ListMediaFilter } from './media.repository';

const WEBP_MAX_WIDTH = 2000;
const THUMBNAIL_WIDTH = 300;
const WEBP_QUALITY = 82;

export interface UploadResult {
  id: string;
  relativePath: string;
  thumbnailPath: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly uploadConfig: UploadConfigService,
  ) {}

  async upload(
    file: Express.Multer.File | undefined,
    domain: string,
    uploadedBy: string,
    entityType?: string,
    entityId?: string,
  ): Promise<UploadResult> {
    if (!file)
      throw new BadRequestException(
        'No file was uploaded (field name: "file")',
      );
    if (!isUploadableDomain(domain)) {
      throw new BadRequestException(`Unsupported upload domain: ${domain}`);
    }

    // Never trust the client's declared mimetype/filename — sniff the real type from the
    // file's magic bytes (docs/12-UPLOAD-SYSTEM.md §2).
    const sniffed = await FileType.fromBuffer(file.buffer);
    if (!sniffed || !IMAGE_MIME_TYPES.includes(sniffed.mime)) {
      throw new BadRequestException(
        'Only JPEG, PNG, WebP, or AVIF images are accepted for this upload',
      );
    }
    if (file.size > this.uploadConfig.maxImageSizeBytes) {
      throw new BadRequestException(
        `Image exceeds the maximum allowed size (${Math.floor(this.uploadConfig.maxImageSizeBytes / (1024 * 1024))}MB)`,
      );
    }

    const filename = randomUUID();
    const domainDir = path.join(this.uploadConfig.rootPath, domain);

    const { data: optimized, info } = await sharp(file.buffer)
      .rotate()
      .resize({ width: WEBP_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    const thumbnail = await sharp(file.buffer)
      .rotate()
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const mainName = `${filename}.webp`;
    const thumbName = `${filename}-thumb.webp`;
    await fs.writeFile(path.join(domainDir, mainName), optimized);
    await fs.writeFile(path.join(domainDir, thumbName), thumbnail);

    const relativePath = `${domain}/${mainName}`;
    const thumbnailPath = `${domain}/${thumbName}`;

    const asset = await this.mediaRepository.create({
      relativePath,
      mimeType: 'image/webp',
      sizeBytes: optimized.length,
      width: info.width,
      height: info.height,
      type: 'IMAGE',
      entityType,
      entityId,
      uploadedBy,
    });

    return {
      id: asset.id,
      relativePath: asset.relativePath,
      thumbnailPath,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      width: asset.width,
      height: asset.height,
    };
  }

  list(filter: ListMediaFilter) {
    return this.mediaRepository.list(filter).then(({ data, total }) => ({
      data,
      meta: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filter.limit)),
      },
    }));
  }

  async remove(id: string): Promise<void> {
    const asset = await this.mediaRepository.findById(id);
    if (!asset) throw new NotFoundException('Media asset not found');
    // Soft delete only — the physical file is removed later by an explicit purge job
    // (docs/12-UPLOAD-SYSTEM.md §5), never synchronously here.
    await this.mediaRepository.softDelete(id);
  }
}
