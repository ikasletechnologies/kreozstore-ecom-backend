import { Global, Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { validateEnv } from './env.validation';
import { AppConfigService } from './services/app-config.service';
import { DatabaseConfigService } from './services/database-config.service';
import { JwtConfigService } from './services/jwt-config.service';
import { RedisConfigService } from './services/redis-config.service';
import { UploadConfigService } from './services/upload-config.service';
import { MailConfigService } from './services/mail-config.service';
import { RazorpayConfigService } from './services/razorpay-config.service';
import { SecurityConfigService } from './services/security-config.service';
import { SwaggerConfigService } from './services/swagger-config.service';
import { SeedConfigService } from './services/seed-config.service';

const CONFIG_SERVICES = [
  AppConfigService,
  DatabaseConfigService,
  JwtConfigService,
  RedisConfigService,
  UploadConfigService,
  MailConfigService,
  RazorpayConfigService,
  SecurityConfigService,
  SwaggerConfigService,
  SeedConfigService,
];

/**
 * Global config module. Validates the full environment once at bootstrap (fail-fast on
 * anything missing/malformed — see env.validation.ts) and exposes one typed wrapper
 * service per concern, per docs/07-MODULE-BREAKDOWN.md, so the rest of the app injects
 * e.g. `RedisConfigService` instead of stringly-typed `configService.get('REDIS_HOST')`.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env'],
    }),
  ],
  providers: [ConfigService, ...CONFIG_SERVICES],
  exports: [ConfigService, ...CONFIG_SERVICES],
})
export class ConfigModule {}
