import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { SecurityConfigService } from './config/services/security-config.service';
import { UploadConfigService } from './config/services/upload-config.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ThrottlerStorageRedisService } from './redis/throttler-storage-redis.service';
import { MailModule } from './mail/mail.module';
import { QueueModule } from './queue/queue.module';
import { HealthModule } from './modules/health/health.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { AttributesModule } from './modules/attributes/attributes.module';
import { MediaModule } from './modules/media/media.module';
import { ProductsModule } from './modules/products/products.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { BannersModule } from './modules/banners/banners.module';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [
    ConfigModule,
    ServeStaticModule.forRootAsync({
      inject: [UploadConfigService],
      useFactory: (uploadConfig: UploadConfigService) => [
        {
          rootPath: uploadConfig.rootPath,
          serveRoot: '/uploads',
          serveStaticOptions: {
            immutable: true,
            maxAge: '1y',
          },
        },
      ],
    }),
    PrismaModule,
    RedisModule,
    MailModule,
    QueueModule,
    PermissionsModule,
    ThrottlerModule.forRootAsync({
      inject: [SecurityConfigService, ThrottlerStorageRedisService],
      useFactory: (
        security: SecurityConfigService,
        storage: ThrottlerStorageRedisService,
      ) => ({
        throttlers: [
          {
            ttl: seconds(security.throttleTtlSeconds),
            limit: security.throttleLimit,
          },
        ],
        storage,
      }),
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CategoriesModule,
    BrandsModule,
    AttributesModule,
    MediaModule,
    ProductsModule,
    AddressesModule,
    CartModule,
    OrdersModule,
    BannersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Order matters: authenticate first, then coarse role check, then fine-grained permissions.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
