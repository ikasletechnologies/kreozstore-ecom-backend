import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

/** Shared list-query shape — `?page=&limit=&sort=&order=&search=` per docs/08-API-DOCUMENTATION.md. */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
