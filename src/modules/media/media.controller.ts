import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../../decorators/permissions.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { MediaService } from './media.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { ListMediaQueryDto } from './dto/list-media-query.dto';

// Static per-request max — precise per-domain size limits are enforced in MediaService once
// the real (magic-byte sniffed) type is known; this just stops an obviously oversized body
// from being buffered into memory at all.
const MULTER_MAX_FILE_BYTES = 15 * 1024 * 1024;

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @Permissions('media.upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload an image; returns its relative path + media asset id',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MULTER_MAX_FILE_BYTES },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.upload(
      file,
      dto.domain,
      user.id,
      dto.entityType,
      dto.entityId,
    );
  }

  @Get()
  @Permissions('media.read')
  @ApiOperation({ summary: 'Media library listing, filterable by type/entity' })
  list(@Query() query: ListMediaQueryDto) {
    return this.mediaService.list(query);
  }

  @Delete(':id')
  @Permissions('media.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete a media asset (file purged later, not immediately)',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.mediaService.remove(id);
  }
}
