import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { BannerPosition } from '@prisma/client';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

const BANNER_POSITIONS: BannerPosition[] = [
  'HOME_TOP',
  'HOME_MIDDLE',
  'CATEGORY_TOP',
  'SIDEBAR',
  'CHECKOUT',
];

export class CreateBannerDto {
  @ApiProperty()
  @IsString()
  @MaxLength(150)
  title!: string;

  @ApiProperty({ description: 'Relative path returned by POST /media/upload' })
  @IsString()
  imagePath!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  linkUrl?: string;

  @ApiProperty({ enum: BANNER_POSITIONS })
  @IsIn(BANNER_POSITIONS)
  position!: BannerPosition;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
