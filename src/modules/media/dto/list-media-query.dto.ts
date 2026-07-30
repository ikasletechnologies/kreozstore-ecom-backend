import { ApiPropertyOptional } from '@nestjs/swagger';
import type { MediaType } from '@prisma/client';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

const MEDIA_TYPES: MediaType[] = ['IMAGE', 'DOCUMENT', 'VIDEO'];

export class ListMediaQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 24, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit: number = 24;

  @ApiPropertyOptional({ enum: MEDIA_TYPES })
  @IsOptional()
  @IsIn(MEDIA_TYPES)
  type?: MediaType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;
}
