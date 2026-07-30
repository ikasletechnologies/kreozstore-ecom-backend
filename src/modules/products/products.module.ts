import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { ProductImportProcessor } from './product-import.processor';

@Module({
  imports: [MediaModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository, ProductImportProcessor],
  exports: [ProductsService],
})
export class ProductsModule {}
