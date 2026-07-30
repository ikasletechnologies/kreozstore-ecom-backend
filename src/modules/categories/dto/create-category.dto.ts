import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateCategoryDto {
  @ApiProperty({ example: 'Men Shoes' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ description: 'Auto-generated from name when omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Relative path returned by POST /media/upload',
  })
  @IsOptional()
  @IsString()
  imagePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: CATALOG_STATUSES, default: 'PUBLISHED' })
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
