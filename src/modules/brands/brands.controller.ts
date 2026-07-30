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
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { ListBrandsQueryDto } from './dto/list-brands-query.dto';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List brands' })
  list(@Query() query: ListBrandsQueryDto) {
    return this.brandsService.list(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Brand detail' })
  getBySlug(@Param('slug') slug: string) {
    return this.brandsService.getBySlug(slug);
  }

  @Post()
  @Permissions('brands.create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a brand' })
  create(@Body() dto: CreateBrandDto, @CurrentUser() user: AuthenticatedUser) {
    return this.brandsService.create(dto, user.id);
  }

  @Patch(':id')
  @Permissions('brands.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a brand' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.brandsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions('brands.delete')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a brand' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.brandsService.remove(id, user.id);
  }
}
