import { Module } from '@nestjs/common';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { BannersRepository } from './banners.repository';

@Module({
  controllers: [BannersController],
  providers: [BannersService, BannersRepository],
})
export class BannersModule {}
