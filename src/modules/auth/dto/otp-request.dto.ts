import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber } from 'class-validator';

export class OtpRequestDto {
  @ApiProperty({
    example: '+919876543210',
    description: 'Phone number to verify',
  })
  @IsPhoneNumber()
  identifier!: string;
}
