import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../decorators/permissions.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { RolesService } from './roles.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('roles.read')
  @ApiOperation({ summary: 'List roles with permission counts' })
  list() {
    return this.rolesService.list();
  }

  @Get(':id')
  @Permissions('roles.read')
  @ApiOperation({
    summary: 'Role detail: full permission catalog with per-role assignment',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id/permissions')
  @Roles('SUPER_ADMIN')
  @Permissions('roles.update')
  @ApiOperation({ summary: "Replace a role's default permission bundle" })
  updatePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rolesService.updatePermissions(id, dto, currentUser.id);
  }
}
