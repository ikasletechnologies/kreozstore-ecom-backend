import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty({ minimum: 1, default: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}
