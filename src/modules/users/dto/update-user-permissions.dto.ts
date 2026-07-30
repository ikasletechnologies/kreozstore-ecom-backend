import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PermissionOverrideDto {
  @ApiProperty({ example: 'products.delete' })
  @IsString()
  permissionCode!: string;

  @ApiProperty({
    description:
      'true = grant beyond the role default, false = revoke a role default',
  })
  @IsBoolean()
  granted!: boolean;
}

/** Replace-all semantics: the given list becomes the user's complete set of overrides. */
export class UpdateUserPermissionsDto {
  @ApiProperty({ type: [PermissionOverrideDto] })
  @ValidateNested({ each: true })
  @Type(() => PermissionOverrideDto)
  @ArrayMaxSize(500)
  overrides!: PermissionOverrideDto[];
}
