import { ApiPropertyOptional } from '@nestjs/swagger';
import type { ProductStatus } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const CATALOG_STATUSES: ProductStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export class ListBrandsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CATALOG_STATUSES })
  @IsOptional()
  @IsIn(CATALOG_STATUSES)
  status?: ProductStatus;
}
