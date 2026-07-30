import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../decorators/permissions.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ApiOperation({
    summary: 'Create a Cash-on-Delivery order from the current cart',
  })
  checkout(@Body() dto: CheckoutDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.checkout(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Current user's orders" })
  listMine(
    @Query() query: ListOrdersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.listMine(
      user.id,
      query.page,
      query.limit,
      query.status,
    );
  }

  @Get('admin/all')
  @Permissions('orders.read')
  @ApiOperation({ summary: 'List every order (admin)' })
  listAll(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.listAll(query.page, query.limit, query.status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Order detail — owner or orders.read' })
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.getOne(id, user);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: "Cancel one of the current user's orders, while cancellable",
  })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.cancel(id, user.id, dto);
  }

  @Patch(':id/status')
  @Permissions('orders.update')
  @ApiOperation({ summary: 'Transition an order to its next status (admin)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateStatus(id, dto, user.id);
  }
}
