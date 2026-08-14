import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppConfigService } from './config/services/app-config.service';
import { SwaggerConfigService } from './config/services/swagger-config.service';

/**
 * Shared app configuration (Helmet, cookies, CORS, prefix, validation, Swagger) — used by
 * both `main.ts` and the e2e test bootstrap so tests exercise the exact same pipeline as
 * production instead of a hand-rolled approximation that could silently drift from it.
 */
export function configureApp(app: NestExpressApplication): {
  appConfig: AppConfigService;
  swaggerConfig: SwaggerConfigService;
} {
  const appConfig = app.get(AppConfigService);
  const swaggerConfig = app.get(SwaggerConfigService);

  // Behind Nginx in production — without this, req.ip is the proxy's address, which would
  // break per-IP login rate limiting (docs/16-REDIS-PLAN.md §3).
  app.set('trust proxy', 1);
  // Default CORP (same-origin) blocks the storefront — a separate origin — from embedding
  // <img> tags served from /uploads (e.g. product photos), even though CORS_ORIGINS already
  // allows it; CORP is a distinct browser mechanism CORS headers don't satisfy. Uploads are
  // public product/brand/category media meant to be embedded cross-origin by design.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
  });
  // API_PREFIX already encodes the version (api/v1) — see docs/19-ENVIRONMENT-VARIABLES.md —
  // so Nest's separate URI versioning system is deliberately not used here. /health stays
  // unprefixed and unversioned since it's an infra check (uptime monitors, Docker healthcheck,
  // load balancer probes), not part of the public API surface — matches docs/20-DOCKER-DEPLOYMENT.md.
  app.setGlobalPrefix(appConfig.apiPrefix, { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (swaggerConfig.enabled && !appConfig.isProduction) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Enterprise E-Commerce Platform API')
        .setDescription(
          'See docs/08-API-DOCUMENTATION.md for the full endpoint catalog',
        )
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup(swaggerConfig.path, app, document);
  }

  return { appConfig, swaggerConfig };
}
