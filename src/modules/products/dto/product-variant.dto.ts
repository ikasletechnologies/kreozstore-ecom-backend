import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

/** Shared by create and update — presence of `id` on update means "modify this variant",
 * absence means "create a new one". Variants missing from an update's array are soft-deleted
 * (see ProductsService.syncVariants), never hard-deleted, so stock history stays intact. */
export class ProductVariantDto {
  @ApiPropertyOptional({ description: 'Omit to create a new variant' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({
    description: 'Auto-generated from the product slug when omitted',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 1999 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mrp!: number;

  @ApiProperty({ example: 1499 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPrice!: number;

  @ApiProperty({ example: 900 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gstRatePct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  weightGrams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lengthMm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  widthMm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  heightMm?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'AttributeValue ids, e.g. [Size:XL, Color:Red]',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  @ArrayMaxSize(20)
  attributeValueIds?: string[];
}
