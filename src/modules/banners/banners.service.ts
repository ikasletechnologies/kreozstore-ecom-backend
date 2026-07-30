import { Injectable, NotFoundException } from '@nestjs/common';
import type { Banner } from '@prisma/client';
import { BannersRepository } from './banners.repository';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { ListBannersQueryDto } from './dto/list-banners-query.dto';

@Injectable()
export class BannersService {
  constructor(private readonly bannersRepository: BannersRepository) {}

  listLive(query: ListBannersQueryDto): Promise<Banner[]> {
    return this.bannersRepository.listLive(query.position);
  }

  listAll(): Promise<Banner[]> {
    return this.bannersRepository.listAll();
  }

  async create(dto: CreateBannerDto, currentUserId: string): Promise<Banner> {
    return this.bannersRepository.create({
      title: dto.title,
      imagePath: dto.imagePath,
      linkUrl: dto.linkUrl,
      position: dto.position,
      sortOrder: dto.sortOrder ?? 0,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      isActive: dto.isActive ?? true,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
  }

  async update(
    id: string,
    dto: UpdateBannerDto,
    currentUserId: string,
  ): Promise<Banner> {
    const existing = await this.bannersRepository.findById(id);
    if (!existing) throw new NotFoundException('Banner not found');

    return this.bannersRepository.update(id, {
      title: dto.title,
      imagePath: dto.imagePath,
      linkUrl: dto.linkUrl,
      position: dto.position,
      sortOrder: dto.sortOrder,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      isActive: dto.isActive,
      updatedBy: currentUserId,
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.bannersRepository.findById(id);
    if (!existing) throw new NotFoundException('Banner not found');
    await this.bannersRepository.softDelete(id);
  }
}
