import { ApiPropertyOptional } from '@nestjs/swagger';
import type { UserRole, UserStatus } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const USER_ROLES: UserRole[] = ['SUPER_ADMIN', 'CUSTOMER'];

const USER_STATUSES: UserStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'BANNED',
  'PENDING_VERIFICATION',
];

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @ApiPropertyOptional({ enum: USER_STATUSES })
  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: UserStatus;
}
