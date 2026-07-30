import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface HealthResponseBody {
  status: 'ok' | 'error';
  dependencies: {
    postgres: { status: 'up' | 'down' };
    redis: { status: 'up' | 'down' };
  };
}

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET) reports Postgres and Redis connectivity', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    const body = response.body as HealthResponseBody;
    expect(body.status).toBe('ok');
    expect(body.dependencies.postgres.status).toBe('up');
    expect(body.dependencies.redis.status).toBe('up');
  });

  afterEach(async () => {
    await app.close();
  });
});
