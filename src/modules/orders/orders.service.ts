import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrderStatus } from '@prisma/client';
import { AddressesRepository } from '../addresses/addresses.repository';
import { CartRepository } from '../cart/cart.repository';
import { ProductsService } from '../products/products.service';
import { PermissionsService } from '../permissions/permissions.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import type { PaginatedResult } from '../../common/types/paginated-result.interface';
import {
  OrdersRepository,
  type CheckoutItemInput,
  type OrderWithDetails,
} from './orders.repository';
import { CheckoutDto } from './dto/checkout.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  ALLOWED_TRANSITIONS,
  CUSTOMER_CANCELLABLE_STATUSES,
} from './orders.constants';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly cartRepository: CartRepository,
    private readonly addressesRepository: AddressesRepository,
    private readonly productsService: ProductsService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async checkout(userId: string, dto: CheckoutDto): Promise<OrderWithDetails> {
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const address = await this.addressesRepository.findById(dto.addressId);
    if (!address || address.userId !== userId) {
      throw new NotFoundException('Address not found');
    }

    let subtotal = 0;
    const items: CheckoutItemInput[] = [];
    for (const cartItem of cart.items) {
      const variant = await this.productsService.getSellableVariant(
        cartItem.variantId,
      );
      const unitPrice = Number(variant.sellingPrice);
      const lineTotal = unitPrice * cartItem.quantity;
      subtotal += lineTotal;
      items.push({
        variantId: variant.id,
        productTitleSnapshot: variant.product.title,
        skuSnapshot: variant.sku,
        unitPrice: unitPrice.toFixed(2),
        quantity: cartItem.quantity,
        lineTotal: lineTotal.toFixed(2),
      });
    }

    const orderNumber = await this.generateOrderNumber();

    return this.ordersRepository.createFromCheckout({
      userId,
      cartId: cart.id,
      addressId: dto.addressId,
      notes: dto.notes,
      orderNumber,
      items,
      subtotal: subtotal.toFixed(2),
      grandTotal: subtotal.toFixed(2),
    });
  }

  async listMine(
    userId: string,
    page: number,
    limit: number,
    status?: OrderStatus,
  ): Promise<PaginatedResult<OrderWithDetails>> {
    const { data, total } = await this.ordersRepository.listForUser(
      userId,
      page,
      limit,
      status,
    );
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async listAll(
    page: number,
    limit: number,
    status?: OrderStatus,
  ): Promise<PaginatedResult<OrderWithDetails>> {
    const { data, total } = await this.ordersRepository.listAll(
      page,
      limit,
      status,
    );
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getOne(id: string, user: AuthenticatedUser): Promise<OrderWithDetails> {
    const order = await this.ordersRepository.findById(id);
    if (!order) throw new NotFoundException('Order not found');

    if (order.userId !== user.id) {
      const canReadAny = await this.permissionsService.hasAll(
        user.id,
        user.role,
        ['orders.read'],
      );
      if (!canReadAny) throw new ForbiddenException('Not your order');
    }

    return order;
  }

  async cancel(
    id: string,
    userId: string,
    dto: CancelOrderDto,
  ): Promise<OrderWithDetails> {
    const order = await this.ordersRepository.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Not your order');

    if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) {
      throw new ConflictException(
        `Order can no longer be cancelled (status: ${order.status})`,
      );
    }

    return this.ordersRepository.transition(
      id,
      'CANCELLED',
      dto.reason ?? 'Cancelled by customer',
      userId,
    );
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    actorId: string,
  ): Promise<OrderWithDetails> {
    const order = await this.ordersRepository.findById(id);
    if (!order) throw new NotFoundException('Order not found');

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(dto.status)) {
      throw new ConflictException(
        `Cannot transition an order from ${order.status} to ${dto.status}`,
      );
    }

    return this.ordersRepository.transition(id, dto.status, dto.note, actorId);
  }

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = Math.floor(100000 + Math.random() * 900000);
      const candidate = `ORD-${year}-${suffix}`;
      const existing = await this.ordersRepository.findByOrderNumber(candidate);
      if (!existing) return candidate;
    }
    throw new ConflictException(
      'Could not generate a unique order number, please retry',
    );
  }
}
