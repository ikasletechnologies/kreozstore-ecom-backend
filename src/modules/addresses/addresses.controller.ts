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
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('addresses')
@ApiBearerAuth()
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: "Current user's saved addresses" })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add an address' })
  create(
    @Body() dto: CreateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addressesService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update one of the current user's addresses" })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addressesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft delete one of the current user's addresses" })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.addressesService.remove(id, user.id);
  }
}
