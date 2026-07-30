import { ApiPropertyOptional } from '@nestjs/swagger';
import type { BannerPosition } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';

const BANNER_POSITIONS: BannerPosition[] = [
  'HOME_TOP',
  'HOME_MIDDLE',
  'CATEGORY_TOP',
  'SIDEBAR',
  'CHECKOUT',
];

export class ListBannersQueryDto {
  @ApiPropertyOptional({ enum: BANNER_POSITIONS })
  @IsOptional()
  @IsIn(BANNER_POSITIONS)
  position?: BannerPosition;
}
