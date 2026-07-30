import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../decorators/permissions.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { UsersService } from './users.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users.read')
  @ApiOperation({
    summary: 'List admin/customer accounts, filterable by role/status',
  })
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.list(query);
  }

  @Get(':id')
  @Permissions('users.read')
  @ApiOperation({
    summary: 'User detail, including resolved permissions and overrides',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Permissions('users.update')
  @ApiOperation({ summary: "Update a user's profile, role, or status" })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, currentUser.id);
  }

  @Delete(':id')
  @Permissions('users.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a user' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<void> {
    await this.usersService.remove(id, currentUser.id);
  }

  @Post(':id/restore')
  @Permissions('users.delete')
  @ApiOperation({ summary: 'Restore a soft-deleted user' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.restore(id);
  }

  @Patch(':id/permissions')
  @Roles('SUPER_ADMIN')
  @Permissions('roles.update')
  @ApiOperation({
    summary:
      'Grant/revoke per-user permission overrides beyond the role default',
  })
  setPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserPermissionsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.usersService.setPermissionOverrides(id, dto, currentUser.id);
  }
}
