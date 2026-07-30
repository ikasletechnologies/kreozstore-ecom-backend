import { ApiPropertyOptional } from '@nestjs/swagger';
import type { AddressType } from '@prisma/client';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const ADDRESS_TYPES: AddressType[] = ['SHIPPING', 'BILLING'];

export class UpdateAddressDto {
  @ApiPropertyOptional({ enum: ADDRESS_TYPES })
  @IsOptional()
  @IsIn(ADDRESS_TYPES)
  type?: AddressType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(12)
  pincode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
