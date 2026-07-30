import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RolesRepository } from './roles.repository';

@Module({
  imports: [UsersModule],
  controllers: [RolesController],
  providers: [RolesService, RolesRepository],
})
export class RolesModule {}
