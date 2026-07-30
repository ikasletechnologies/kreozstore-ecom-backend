import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsString } from 'class-validator';

/** Replace-all semantics: this list becomes the role's complete default permission bundle. */
export class UpdateRolePermissionsDto {
  @ApiProperty({
    type: [String],
    example: ['products.read', 'products.update'],
  })
  @IsString({ each: true })
  @ArrayUnique()
  @ArrayMaxSize(500)
  permissionCodes!: string[];
}
