import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateBannerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imagePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  linkUrl?: string;

  @ApiPropertyOptional({ enum: BANNER_POSITIONS })
  @IsOptional()
  @IsIn(BANNER_POSITIONS)
  position?: BannerPosition;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
