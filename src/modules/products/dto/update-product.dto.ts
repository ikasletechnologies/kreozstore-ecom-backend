import { ApiPropertyOptional } from '@nestjs/swagger';
import type { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProductVariantDto } from './product-variant.dto';

const CATALOG_STATUSES: ProductStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(220)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ enum: CATALOG_STATUSES })
  @IsOptional()
  @IsIn(CATALOG_STATUSES)
  status?: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTrending?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBestSeller?: boolean;

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

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  tagNames?: string[];

  @ApiPropertyOptional({
    type: [ProductVariantDto],
    description:
      'Replace-all: variants present here are created/updated, omitted existing ones are soft-deleted',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  @ArrayMaxSize(100)
  variants?: ProductVariantDto[];
}
