import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_POLICY, {
    message: 'newPassword must contain at least one letter and one number',
  })
  newPassword!: string;
}
