import { ApiPropertyOptional } from '@nestjs/swagger';
import type { ProductStatus } from '@prisma/client';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

const CATALOG_STATUSES: ProductStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imagePath?: string;

  @ApiPropertyOptional({
    description: 'Re-parent this category; null moves it to root',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: CATALOG_STATUSES })
  @IsOptional()
  @IsIn(CATALOG_STATUSES)
  status?: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaKeywords?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  canonicalUrl?: string;
}
