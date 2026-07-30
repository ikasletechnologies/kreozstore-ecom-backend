import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
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

export class CreateProductDto {
  @ApiProperty({ example: 'Classic Running Shoe' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    description: 'Auto-generated from title when omitted',
  })
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

  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ enum: CATALOG_STATUSES, default: 'DRAFT' })
  @IsOptional()
  @IsIn(CATALOG_STATUSES)
  status?: ProductStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isTrending?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: false })
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

  @ApiPropertyOptional({ type: [String], example: ['running', 'summer'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  tagNames?: string[];

  @ApiProperty({ type: [ProductVariantDto] })
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  variants!: ProductVariantDto[];
}
