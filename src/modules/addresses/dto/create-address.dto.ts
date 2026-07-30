import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AddressType } from '@prisma/client';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const ADDRESS_TYPES: AddressType[] = ['SHIPPING', 'BILLING'];

export class CreateAddressDto {
  @ApiProperty({ enum: ADDRESS_TYPES })
  @IsIn(ADDRESS_TYPES)
  type!: AddressType;

  @ApiProperty()
  @IsString()
  @MaxLength(150)
  fullName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20)
  phone!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  line1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  state!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(12)
  pincode!: string;

  @ApiPropertyOptional({ default: 'IN' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
