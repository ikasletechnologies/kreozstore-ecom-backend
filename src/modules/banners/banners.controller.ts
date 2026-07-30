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
import { Public } from '../../decorators/public.decorator';
import { Permissions } from '../../decorators/permissions.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { ListBannersQueryDto } from './dto/list-banners-query.dto';

@ApiTags('banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Currently-live banners, optionally filtered by placement',
  })
  listLive(@Query() query: ListBannersQueryDto) {
    return this.bannersService.listLive(query);
  }

  @Get('admin/all')
  @Permissions('banners.read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Every banner regardless of active/scheduling status (admin)',
  })
  listAll() {
    return this.bannersService.listAll();
  }

  @Post()
  @Permissions('banners.create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a banner' })
  create(@Body() dto: CreateBannerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bannersService.create(dto, user.id);
  }

  @Patch(':id')
  @Permissions('banners.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a banner' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBannerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bannersService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions('banners.delete')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a banner' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.bannersService.remove(id);
  }
}
