import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAttributeDto {
  @ApiProperty({ example: 'Size' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
