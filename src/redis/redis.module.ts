import { Global, Logger, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisConfigService } from '../config/services/redis-config.service';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';
import { ThrottlerStorageRedisService } from './throttler-storage-redis.service';

const redisClientProvider = {
  provide: REDIS_CLIENT,
  inject: [RedisConfigService],
  useFactory: (redisConfig: RedisConfigService): Redis => {
    const logger = new Logger('RedisClient');
    const client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      maxRetriesPerRequest: 3,
    });
    client.on('error', (err) =>
      logger.error(`Redis connection error: ${err.message}`),
    );
    client.on('connect', () => logger.log('Connected to Redis'));
    return client;
  },
};

@Global()
@Module({
  providers: [redisClientProvider, RedisService, ThrottlerStorageRedisService],
  exports: [REDIS_CLIENT, RedisService, ThrottlerStorageRedisService],
})
export class RedisModule {}
