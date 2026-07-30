import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAttributeValueDto {
  @ApiProperty({ example: 'XL' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  value!: string;

  @ApiPropertyOptional({ example: '#FF0000' })
  @IsOptional()
  @IsHexColor()
  swatchHex?: string;
}

export class UpdateAttributeValueDto {
  @ApiPropertyOptional({ example: 'XL' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  value?: string;

  @ApiPropertyOptional({ example: '#FF0000' })
  @IsOptional()
  @IsHexColor()
  swatchHex?: string;
}
