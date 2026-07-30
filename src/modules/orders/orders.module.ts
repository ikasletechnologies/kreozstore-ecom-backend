import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { CartModule } from '../cart/cart.module';
import { AddressesModule } from '../addresses/addresses.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';

@Module({
  imports: [ProductsModule, CartModule, AddressesModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
