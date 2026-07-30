import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Cart, CartItem } from '@prisma/client';
import { ProductsService } from '../products/products.service';
import { CartRepository, type CartWithItems } from './cart.repository';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productsService: ProductsService,
  ) {}

  async getMyCart(userId: string): Promise<CartWithItems> {
    await this.getOrCreateCart(userId);
    // Guaranteed non-null: getOrCreateCart just ensured a row exists for this user.
    return (await this.cartRepository.findByUserId(userId))!;
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartItem> {
    await this.productsService.getSellableVariant(dto.variantId);
    const cart = await this.getOrCreateCart(userId);

    const existing = await this.cartRepository.findItemByVariant(
      cart.id,
      dto.variantId,
    );
    if (existing) {
      return this.cartRepository.updateItemQuantity(
        existing.id,
        existing.quantity + dto.quantity,
      );
    }
    return this.cartRepository.addItem(cart.id, dto.variantId, dto.quantity);
  }

  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartItem> {
    await this.getOwnedItem(itemId, userId);
    return this.cartRepository.updateItemQuantity(itemId, dto.quantity);
  }

  async removeItem(userId: string, itemId: string): Promise<void> {
    await this.getOwnedItem(itemId, userId);
    await this.cartRepository.removeItem(itemId);
  }

  private async getOrCreateCart(userId: string): Promise<Cart> {
    const existing = await this.cartRepository.findByUserId(userId);
    if (existing) return existing;
    return this.cartRepository.create(userId);
  }

  private async getOwnedItem(itemId: string, userId: string) {
    const item = await this.cartRepository.findItemById(itemId);
    if (!item) throw new NotFoundException('Cart item not found');
    if (item.cart.userId !== userId)
      throw new ForbiddenException('Not your cart item');
    return item;
  }
}
