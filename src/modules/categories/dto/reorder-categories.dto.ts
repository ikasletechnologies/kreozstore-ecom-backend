import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsInt,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class ReorderCategoryItemDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty({
    required: false,
    description: 'null moves the category to root',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiProperty()
  @IsInt()
  sortOrder!: number;
}

export class ReorderCategoriesDto {
  @ApiProperty({ type: [ReorderCategoryItemDto] })
  @ValidateNested({ each: true })
  @Type(() => ReorderCategoryItemDto)
  @ArrayMaxSize(1000)
  items!: ReorderCategoryItemDto[];
}
