import { ApiPropertyOptional } from '@nestjs/swagger';
import type { UserRole, UserStatus } from '@prisma/client';
import {
  IsIn,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const USER_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'INVENTORY_MANAGER',
  'SALES_MANAGER',
  'ORDER_MANAGER',
  'CUSTOMER_SUPPORT',
  'MARKETING',
  'CUSTOMER',
];

const USER_STATUSES: UserStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'BANNED',
  'PENDING_VERIFICATION',
];

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @ApiPropertyOptional({ enum: USER_STATUSES })
  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: UserStatus;
}
