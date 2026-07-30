import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CheckoutDto {
  @ApiProperty()
  @IsUUID()
  addressId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
