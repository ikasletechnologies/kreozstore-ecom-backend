import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const { appConfig } = configureApp(app);

  await app.listen(appConfig.port);
  Logger.log(
    `Backend listening on port ${appConfig.port} (${appConfig.nodeEnv})`,
    'Bootstrap',
  );
}

void bootstrap();
