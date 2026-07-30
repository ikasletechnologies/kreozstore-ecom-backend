import { Module } from '@nestjs/common';
import { AttributesController } from './attributes.controller';
import { AttributesService } from './attributes.service';
import { AttributesRepository } from './attributes.repository';

@Module({
  controllers: [AttributesController],
  providers: [AttributesService, AttributesRepository],
})
export class AttributesModule {}
