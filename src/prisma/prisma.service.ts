import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { DatabaseConfigService } from '../config/services/database-config.service';

/**
 * Prisma 7 requires an explicit driver adapter at runtime (the connection URL no longer
 * lives in schema.prisma — see docs/06-PRISMA-SCHEMA.md's implementation note). Lifecycle
 * hooks connect/disconnect the underlying pg pool alongside the Nest application.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(databaseConfig: DatabaseConfigService) {
    super({
      adapter: new PrismaPg({ connectionString: databaseConfig.url }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL');
  }

  /** Used by the health check — throws if the connection is unusable. */
  async ping(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }
}
