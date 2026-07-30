import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { OrderStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ORDER_STATUSES } from '../orders.constants';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ORDER_STATUSES })
  @IsIn(ORDER_STATUSES)
  status!: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
