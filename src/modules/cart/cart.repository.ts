import { Injectable } from '@nestjs/common';
import type { Cart, CartItem, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const CART_INCLUDE = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              images: {
                where: { deletedAt: null },
                orderBy: { sortOrder: 'asc' as const },
                take: 1,
              },
            },
          },
          attributeValues: {
            include: { attributeValue: { include: { attribute: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{
  include: typeof CART_INCLUDE;
}>;

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<CartWithItems | null> {
    return this.prisma.cart.findFirst({
      where: { userId, deletedAt: null },
      include: CART_INCLUDE,
    });
  }

  create(userId: string): Promise<Cart> {
    return this.prisma.cart.create({ data: { userId } });
  }

  findItemById(id: string): Promise<(CartItem & { cart: Cart }) | null> {
    return this.prisma.cartItem.findFirst({
      where: { id },
      include: { cart: true },
    });
  }

  findItemByVariant(
    cartId: string,
    variantId: string,
  ): Promise<CartItem | null> {
    return this.prisma.cartItem.findFirst({ where: { cartId, variantId } });
  }

  addItem(
    cartId: string,
    variantId: string,
    quantity: number,
  ): Promise<CartItem> {
    return this.prisma.cartItem.create({
      data: { cartId, variantId, quantity },
    });
  }

  updateItemQuantity(id: string, quantity: number): Promise<CartItem> {
    return this.prisma.cartItem.update({ where: { id }, data: { quantity } });
  }

  removeItem(id: string): Promise<CartItem> {
    return this.prisma.cartItem.delete({ where: { id } });
  }

  async clear(cartId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
  }
}
