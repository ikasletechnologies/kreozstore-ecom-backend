import { ApiPropertyOptional } from '@nestjs/swagger';
import type { OrderStatus } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ORDER_STATUSES } from '../orders.constants';

export class ListOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ORDER_STATUSES })
  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: OrderStatus;
}
