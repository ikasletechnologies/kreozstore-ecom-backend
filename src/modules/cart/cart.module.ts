import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartRepository } from './cart.repository';

@Module({
  imports: [ProductsModule],
  controllers: [CartController],
  providers: [CartService, CartRepository],
  exports: [CartRepository],
})
export class CartModule {}
