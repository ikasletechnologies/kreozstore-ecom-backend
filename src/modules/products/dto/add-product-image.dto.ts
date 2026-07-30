import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddProductImageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  altText?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isThumbnail?: boolean;
}
