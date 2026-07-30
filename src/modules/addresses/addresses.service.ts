import { Injectable, NotFoundException } from '@nestjs/common';
import type { Address } from '@prisma/client';
import { AddressesRepository } from './addresses.repository';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly addressesRepository: AddressesRepository) {}

  list(userId: string): Promise<Address[]> {
    return this.addressesRepository.listByUser(userId);
  }

  async create(dto: CreateAddressDto, userId: string): Promise<Address> {
    if (dto.isDefault) {
      await this.addressesRepository.unsetOtherDefaults(userId, dto.type);
    }
    return this.addressesRepository.create({
      userId,
      type: dto.type,
      fullName: dto.fullName,
      phone: dto.phone,
      line1: dto.line1,
      line2: dto.line2,
      city: dto.city,
      state: dto.state,
      pincode: dto.pincode,
      country: dto.country,
      isDefault: dto.isDefault ?? false,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async update(
    id: string,
    dto: UpdateAddressDto,
    userId: string,
  ): Promise<Address> {
    const existing = await this.getOwned(id, userId);

    if (dto.isDefault) {
      await this.addressesRepository.unsetOtherDefaults(
        userId,
        dto.type ?? existing.type,
        id,
      );
    }

    return this.addressesRepository.update(id, {
      type: dto.type,
      fullName: dto.fullName,
      phone: dto.phone,
      line1: dto.line1,
      line2: dto.line2,
      city: dto.city,
      state: dto.state,
      pincode: dto.pincode,
      country: dto.country,
      isDefault: dto.isDefault,
      updatedBy: userId,
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getOwned(id, userId);
    await this.addressesRepository.softDelete(id, userId);
  }

  /** Ownership check shared by update/remove — a missing or someone-else's address both
   * surface as 404, never revealing that a different user's address id exists. */
  private async getOwned(id: string, userId: string): Promise<Address> {
    const address = await this.addressesRepository.findById(id);
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId)
      throw new NotFoundException('Address not found');
    return address;
  }
}
