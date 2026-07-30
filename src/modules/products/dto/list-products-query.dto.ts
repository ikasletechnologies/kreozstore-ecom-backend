import { ApiPropertyOptional } from '@nestjs/swagger';
import type { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const CATALOG_STATUSES: ProductStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const SORT_FIELDS = ['newest', 'price', 'title'] as const;

export class ListProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ description: 'Tag name' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ enum: CATALOG_STATUSES })
  @IsOptional()
  @IsIn(CATALOG_STATUSES)
  status?: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isTrending?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBestSeller?: boolean;

  @ApiPropertyOptional({ enum: SORT_FIELDS })
  @IsOptional()
  @IsIn(SORT_FIELDS)
  sortBy?: (typeof SORT_FIELDS)[number];
}
