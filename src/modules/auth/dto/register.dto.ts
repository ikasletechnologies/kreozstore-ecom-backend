import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export class RegisterDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Str0ngPass', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_POLICY, {
    message: 'password must contain at least one letter and one number',
  })
  password!: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}
