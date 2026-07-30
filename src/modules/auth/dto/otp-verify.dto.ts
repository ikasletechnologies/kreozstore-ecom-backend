import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class OtpVerifyDto {
  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber()
  identifier!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
