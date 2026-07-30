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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: "Current user's cart" })
  getCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.getMyCart(user.id);
  }

  @Post('items')
  @ApiOperation({
    summary:
      'Add a variant to the cart (increments quantity if already present)',
  })
  addItem(@Body() dto: AddCartItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update a cart item quantity' })
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cartService.updateItem(user.id, id, dto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an item from the cart' })
  async removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.cartService.removeItem(user.id, id);
  }
}
