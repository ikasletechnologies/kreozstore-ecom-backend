import { Injectable } from '@nestjs/common';
import type { Order, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ORDER_INCLUDE = {
  items: {
    include: {
      variant: { select: { product: { select: { slug: true } } } },
    },
  },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  shippingAddress: true,
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

export interface CheckoutItemInput {
  variantId: string;
  productTitleSnapshot: string;
  skuSnapshot: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface CreateFromCheckoutInput {
  userId: string;
  cartId: string;
  addressId: string;
  notes?: string;
  orderNumber: string;
  items: CheckoutItemInput[];
  subtotal: string;
  grandTotal: string;
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { orderNumber } });
  }

  findById(id: string): Promise<OrderWithDetails | null> {
    return this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: ORDER_INCLUDE,
    });
  }

  async listForUser(
    userId: string,
    page: number,
    limit: number,
    status?: OrderStatus,
  ) {
    const where: Prisma.OrderWhereInput = {
      userId,
      deletedAt: null,
      ...(status ? { status } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total };
  }

  async listAll(page: number, limit: number, status?: OrderStatus) {
    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total };
  }

  /** One transaction: creates the order (PENDING), records it, auto-confirms the COD order,
   * records that too, then clears the cart it was placed from — see docs/13-ORDER-FLOW.md's
   * COD sequence. Clears CartItem directly rather than depending on CartModule's repository:
   * this is a single self-contained transaction's cleanup step, not an ongoing cross-module
   * read, so it doesn't need the "go through the other module's service" indirection. */
  async createFromCheckout(
    input: CreateFromCheckoutInput,
  ): Promise<OrderWithDetails> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: input.orderNumber,
          userId: input.userId,
          shippingAddressId: input.addressId,
          status: 'PENDING',
          subtotal: input.subtotal,
          grandTotal: input.grandTotal,
          paymentMethod: 'COD',
          notes: input.notes,
          createdBy: input.userId,
          updatedBy: input.userId,
          items: {
            create: input.items.map((item) => ({
              variantId: item.variantId,
              productTitleSnapshot: item.productTitleSnapshot,
              skuSnapshot: item.skuSnapshot,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
            })),
          },
        },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: 'PENDING', actorId: input.userId },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CONFIRMED' },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'CONFIRMED',
          note: 'COD order confirmed',
          actorId: input.userId,
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: input.cartId } });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: ORDER_INCLUDE,
      });
    });
  }

  async transition(
    id: string,
    status: OrderStatus,
    note: string | undefined,
    actorId: string,
  ): Promise<OrderWithDetails> {
    return this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status, updatedBy: actorId },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: id, status, note, actorId },
      });
      return tx.order.findUniqueOrThrow({
        where: { id },
        include: ORDER_INCLUDE,
      });
    });
  }
}
