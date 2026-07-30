import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../decorators/public.decorator';
import { Permissions } from '../../decorators/permissions.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { AddProductImageDto } from './dto/add-product-image.dto';

const MULTER_MAX_FILE_BYTES = 15 * 1024 * 1024;

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List products with catalog/price/flag filters' })
  list(@Query() query: ListProductsQueryDto) {
    return this.productsService.list(query);
  }

  @Public()
  @Get('search')
  @ApiOperation({
    summary: 'Full-text + facet search (shares filters with the main listing)',
  })
  search(@Query() query: ListProductsQueryDto) {
    return this.productsService.list(query);
  }

  @Get('export')
  @Permissions('products.read')
  @ApiBearerAuth()
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="products-export.csv"')
  @ApiOperation({ summary: 'Bulk CSV export — one row per variant' })
  async export(@Res() res: Response): Promise<void> {
    const csv = await this.productsService.exportCsv();
    res.send(csv);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Product detail with variants, images, and tags' })
  getBySlug(@Param('slug') slug: string) {
    return this.productsService.getBySlug(slug);
  }

  @Post()
  @Permissions('products.create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product with its variants' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.create(dto, user.id);
  }

  @Post('import')
  @Permissions('products.create')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk CSV import (queued) — returns a job id' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MULTER_MAX_FILE_BYTES },
    }),
  )
  import(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.enqueueImport(file, user.id);
  }

  @Patch(':id')
  @Permissions('products.update')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a product; variants replace-all when provided',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions('products.delete')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a product' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.productsService.remove(id, user.id);
  }

  @Post(':id/restore')
  @Permissions('products.delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore a soft-deleted product' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.restore(id);
  }

  @Post(':id/images')
  @Permissions('products.update')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a product image' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MULTER_MAX_FILE_BYTES },
    }),
  )
  addImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AddProductImageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.addImage(id, file, dto, user.id);
  }

  @Delete(':id/images/:imageId')
  @Permissions('products.update')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a product image' })
  async removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<void> {
    await this.productsService.removeImage(id, imageId);
  }
}
