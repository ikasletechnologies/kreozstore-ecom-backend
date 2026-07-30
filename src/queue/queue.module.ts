import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RedisConfigService } from '../config/services/redis-config.service';
import {
  QUEUE_EMAIL,
  QUEUE_INVENTORY,
  QUEUE_INVOICE,
  QUEUE_NOTIFICATION,
  QUEUE_PRODUCT_IMPORT,
} from './queue.constants';
import { EmailProcessor } from './processors/email.processor';

/**
 * Registers the four BullMQ queues from docs/17-BULLMQ-DESIGN.md. Processors are added
 * alongside the modules that produce their jobs — the Auth module is the first producer
 * (verification/reset/OTP emails), so EmailProcessor lands here now; invoice/notification/
 * inventory processors follow in the phases that produce those jobs. BullMQ requires
 * `maxRetriesPerRequest: null` on its own Redis connection (distinct from the cache client in
 * RedisModule, which uses a bounded retry count). Marked @Global so any feature module can
 * `@InjectQueue(...)` without re-registering the queue itself.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [RedisConfigService],
      useFactory: (redisConfig: RedisConfigService) => ({
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: QUEUE_EMAIL,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 },
        },
      },
      { name: QUEUE_INVOICE },
      { name: QUEUE_NOTIFICATION },
      { name: QUEUE_INVENTORY },
      { name: QUEUE_PRODUCT_IMPORT, defaultJobOptions: { attempts: 1 } },
    ),
  ],
  providers: [EmailProcessor],
  exports: [BullModule],
})
export class QueueModule {}
