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
import type { ProductStatus } from '@prisma/client';
import { Public } from '../../decorators/public.decorator';
import { Permissions } from '../../decorators/permissions.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List categories — flat (default) or nested (?format=tree)',
  })
  list(
    @Query('format') format?: string,
    @Query('status') status?: ProductStatus,
  ) {
    return this.categoriesService.list(
      format === 'tree' ? 'tree' : 'flat',
      status,
    );
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Category detail with ancestor breadcrumb' })
  getBySlug(@Param('slug') slug: string) {
    return this.categoriesService.getBySlug(slug);
  }

  @Post()
  @Permissions('categories.create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a category' })
  create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriesService.create(dto, user.id);
  }

  @Patch('reorder')
  @Permissions('categories.update')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk re-parent / re-sort categories (tree drag-and-drop)',
  })
  reorder(
    @Body() dto: ReorderCategoriesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriesService.reorder(dto, user.id);
  }

  @Patch(':id')
  @Permissions('categories.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category, including re-parenting' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions('categories.delete')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete a category (must have no subcategories)',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.categoriesService.remove(id, user.id);
  }
}
