import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { UPLOADABLE_DOMAINS } from '../media.constants';

export class UploadMediaDto {
  @ApiProperty({
    enum: UPLOADABLE_DOMAINS,
    description: 'Which uploads/ subdirectory to store this in',
  })
  @IsIn(UPLOADABLE_DOMAINS)
  domain!: string;

  @ApiPropertyOptional({
    example: 'Category',
    description: 'Entity type this asset belongs to, if any',
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;
}
