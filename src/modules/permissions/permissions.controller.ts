import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../decorators/permissions.decorator';
import { PermissionsService } from './permissions.service';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Full permission catalog, grouped by module' })
  listCatalog() {
    return this.permissionsService.listCatalog();
  }
}
