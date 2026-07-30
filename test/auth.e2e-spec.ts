import { Test, TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';

interface LoginResponseBody {
  accessToken: string;
  user: { id: string; email: string };
}

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app as unknown as NestExpressApplication);
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    redis = moduleFixture.get(RedisService);
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  it('registers, verifies email, logs in, and reads /me', async () => {
    const email = uniqueEmail('register-flow');

    await request(server())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'Passw0rd!',
        firstName: 'Jane',
        lastName: 'Doe',
      })
      .expect(201);

    const user = await prisma.user.findFirstOrThrow({ where: { email } });
    expect(user.status).toBe('PENDING_VERIFICATION');

    // Simulate clicking the emailed link: pull the token straight out of Redis instead of
    // parsing the (unsent, since SMTP isn't configured in this env) email body.
    const token = await findSingleUseToken('email-verify', user.id);
    expect(token).toBeTruthy();

    await request(server())
      .post('/api/v1/auth/verify-email')
      .send({ token })
      .expect(204);

    const verifiedUser = await prisma.user.findFirstOrThrow({
      where: { email },
    });
    expect(verifiedUser.status).toBe('ACTIVE');
    expect(verifiedUser.emailVerifiedAt).not.toBeNull();

    const loginRes = await request(server())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Passw0rd!' })
      .expect(200);

    const body = loginRes.body as LoginResponseBody;
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.user.email).toBe(email);

    const cookies = loginRes.get('Set-Cookie');
    expect(cookies?.some((c) => c.startsWith('refreshToken='))).toBe(true);

    const meRes = await request(server())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);
    expect((meRes.body as { email: string }).email).toBe(email);
  });

  it('rejects /me without a token', async () => {
    await request(server()).get('/api/v1/auth/me').expect(401);
  });

  it('rejects login with the wrong password', async () => {
    const email = uniqueEmail('bad-password');
    await request(server())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Passw0rd!', firstName: 'A', lastName: 'B' })
      .expect(201);

    await request(server())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword1' })
      .expect(401);
  });

  it('rotates the refresh token and revokes the whole session on reuse', async () => {
    const email = uniqueEmail('refresh-flow');
    await request(server())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Passw0rd!', firstName: 'A', lastName: 'B' })
      .expect(201);

    const agent = request.agent(server());
    const loginRes = await agent
      .post('/api/v1/auth/login')
      .send({ email, password: 'Passw0rd!' })
      .expect(200);
    const firstRefreshCookie = extractCookie(
      loginRes.get('Set-Cookie'),
      'refreshToken',
    );

    // First rotation: legitimate use, should succeed and issue a new refresh cookie. (Access
    // tokens are JWTs with second-granularity `iat`, so two issued in the same test tick can
    // be byte-identical — the refresh cookie, an opaque random value, is the real rotation signal.)
    const refreshRes = await agent.post('/api/v1/auth/refresh').expect(200);
    expect((refreshRes.body as LoginResponseBody).accessToken).toEqual(
      expect.any(String),
    );
    const secondRefreshCookie = extractCookie(
      refreshRes.get('Set-Cookie'),
      'refreshToken',
    );
    expect(secondRefreshCookie).not.toBe(firstRefreshCookie);

    // Replay the original (now-rotated-away) refresh token — this is the reuse scenario.
    await request(server())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${firstRefreshCookie}`)
      .expect(401);

    // Reuse detection must have revoked the whole family, so even the *second*, legitimately
    // rotated token no longer works.
    await agent.post('/api/v1/auth/refresh').expect(401);
  });

  it('logs out and revokes the session', async () => {
    const email = uniqueEmail('logout-flow');
    await request(server())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Passw0rd!', firstName: 'A', lastName: 'B' })
      .expect(201);

    const agent = request.agent(server());
    const loginRes = await agent
      .post('/api/v1/auth/login')
      .send({ email, password: 'Passw0rd!' })
      .expect(200);
    const accessToken = (loginRes.body as LoginResponseBody).accessToken;

    await agent
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await agent.post('/api/v1/auth/refresh').expect(200); // no cookie left -> null accessToken path
  });

  it('completes the forgot/reset password flow and revokes existing sessions', async () => {
    const email = uniqueEmail('reset-flow');
    await request(server())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Passw0rd!', firstName: 'A', lastName: 'B' })
      .expect(201);

    const user = await prisma.user.findFirstOrThrow({ where: { email } });

    await request(server())
      .post('/api/v1/auth/forgot-password')
      .send({ email })
      .expect(204);

    const resetToken = await findSingleUseToken('reset-password', user.id);
    expect(resetToken).toBeTruthy();

    await request(server())
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword: 'NewPassw0rd!' })
      .expect(204);

    // Old password no longer works, new one does.
    await request(server())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Passw0rd!' })
      .expect(401);
    await request(server())
      .post('/api/v1/auth/login')
      .send({ email, password: 'NewPassw0rd!' })
      .expect(200);
  });

  /** Scans Redis for the single-use token issued to `userId` in `namespace` — used because
   * the real delivery channel (email) is unavailable/unconfigured in this test environment. */
  async function findSingleUseToken(
    namespace: string,
    userId: string,
  ): Promise<string | null> {
    const raw = redis as unknown as {
      client: {
        keys: (p: string) => Promise<string[]>;
        get: (k: string) => Promise<string | null>;
      };
    };
    const keys = await raw.client.keys(`token:${namespace}:*`);
    for (const key of keys) {
      const value = await raw.client.get(key);
      if (value === userId) {
        return key.slice(`token:${namespace}:`.length);
      }
    }
    return null;
  }
});

function extractCookie(setCookie: string[] | undefined, name: string): string {
  const line = setCookie?.find((c) => c.startsWith(`${name}=`));
  if (!line) throw new Error(`Cookie ${name} not found in Set-Cookie header`);
  return line.split(';')[0].split('=').slice(1).join('=');
}
