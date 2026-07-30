import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';
import { EMAIL_JOB_SEND } from '../../queue/processors/email.processor';
import type { AuthRepository } from './auth.repository';
import type { PermissionsService } from '../permissions/permissions.service';
import type { RedisService } from '../../redis/redis.service';

jest.mock('bcrypt');

type Mocked<T> = { [K in keyof T]: jest.Mock };

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: Mocked<AuthRepository>;
  let permissionsService: Mocked<PermissionsService>;
  let jwtService: { signAsync: jest.Mock };
  let redis: Mocked<RedisService>;
  let emailQueue: { add: jest.Mock };

  const baseUser = {
    id: 'user-1',
    email: 'jane@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: null,
    role: 'CUSTOMER' as const,
    status: 'ACTIVE' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    authRepository = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      findById: jest.fn(),
      findAuthableUserById: jest.fn(),
      isAuthableStatus: jest.fn((status: string) =>
        ['ACTIVE', 'PENDING_VERIFICATION'].includes(status),
      ),
      createUser: jest.fn(),
      markEmailVerified: jest.fn(),
      markPhoneVerified: jest.fn(),
      updatePassword: jest.fn(),
      updateLastLogin: jest.fn(),
      createRefreshToken: jest.fn(),
      findRefreshTokenByHash: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeFamily: jest.fn(),
      revokeAllTokensForUser: jest.fn(),
    };

    permissionsService = {
      resolveEffectivePermissions: jest
        .fn()
        .mockResolvedValue(['products.read']),
      hasAll: jest.fn(),
      invalidate: jest.fn(),
      invalidateUsers: jest.fn(),
      listCatalog: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed.access.token'),
    };

    redis = {
      ping: jest.fn(),
      getCache: jest.fn(),
      setCache: jest.fn(),
      delCache: jest.fn(),
      setOtp: jest.fn(),
      getOtp: jest.fn(),
      incrementOtpAttempts: jest.fn(),
      deleteOtp: jest.fn(),
      isOtpOnCooldown: jest.fn().mockResolvedValue(false),
      setOtpCooldown: jest.fn(),
      incrementRateLimit: jest.fn().mockResolvedValue(1),
      peekRateLimit: jest.fn().mockResolvedValue(0),
      setSingleUseToken: jest.fn(),
      consumeSingleUseToken: jest.fn(),
    } as unknown as Mocked<RedisService>;

    emailQueue = { add: jest.fn() };

    const jwtConfig = { refreshTtl: '30d' };
    const securityConfig = { bcryptSaltRounds: 12 };
    const appConfig = {
      frontendUrl: 'http://localhost:3000',
      isProduction: false,
    };

    service = new AuthService(
      authRepository as unknown as AuthRepository,
      permissionsService as unknown as PermissionsService,
      jwtService as never,
      jwtConfig as never,
      securityConfig as never,
      appConfig as never,
      redis as unknown as RedisService,
      emailQueue as never,
    );
  });

  describe('register', () => {
    it('creates a user and queues a verification email', async () => {
      authRepository.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      authRepository.createUser.mockResolvedValue(baseUser);

      const result = await service.register({
        email: baseUser.email,
        password: 'Passw0rd',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(result).toEqual({ id: baseUser.id, email: baseUser.email });
      expect(authRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: baseUser.email,
          passwordHash: 'hashed-password',
        }),
      );
      expect(redis.setSingleUseToken).toHaveBeenCalledWith(
        'email-verify',
        expect.any(String),
        baseUser.id,
        expect.any(Number),
      );
      expect(emailQueue.add).toHaveBeenCalledWith(
        EMAIL_JOB_SEND,
        expect.objectContaining({ to: baseUser.email }),
      );
    });

    it('rejects a duplicate email', async () => {
      authRepository.findByEmail.mockResolvedValue(baseUser);

      await expect(
        service.register({
          email: baseUser.email,
          password: 'Passw0rd',
          firstName: 'Jane',
          lastName: 'Doe',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(authRepository.createUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('issues an access + refresh token pair on valid credentials', async () => {
      authRepository.findByEmail.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      authRepository.createRefreshToken.mockResolvedValue({ id: 'rt-1' });

      const result = await service.login(
        { email: baseUser.email, password: 'Passw0rd' },
        '127.0.0.1',
        'jest-agent',
      );

      expect(result.accessToken).toBe('signed.access.token');
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.user).toEqual(
        expect.objectContaining({ id: baseUser.id, email: baseUser.email }),
      );
      expect(authRepository.updateLastLogin).toHaveBeenCalledWith(baseUser.id);
    });

    it('rejects an invalid password and records the failure for rate limiting', async () => {
      authRepository.findByEmail.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login(
          { email: baseUser.email, password: 'wrong' },
          '127.0.0.1',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(redis.incrementRateLimit).toHaveBeenCalledWith(
        `login:email:${baseUser.email}`,
        expect.any(Number),
      );
      expect(redis.incrementRateLimit).toHaveBeenCalledWith(
        'login:ip:127.0.0.1',
        expect.any(Number),
      );
    });

    it('rejects a banned account even with the correct password', async () => {
      authRepository.findByEmail.mockResolvedValue({
        ...baseUser,
        status: 'BANNED',
      });
      authRepository.isAuthableStatus.mockReturnValue(false);

      await expect(
        service.login(
          { email: baseUser.email, password: 'Passw0rd' },
          '127.0.0.1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects once the per-email attempt limit is reached', async () => {
      redis.peekRateLimit.mockResolvedValueOnce(5); // LOGIN_EMAIL_LIMIT

      await expect(
        service.login(
          { email: baseUser.email, password: 'Passw0rd' },
          '127.0.0.1',
        ),
      ).rejects.toBeInstanceOf(HttpException);
      expect(authRepository.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('rotates the token and preserves the session family', async () => {
      const rawOldToken = 'old-raw-token';
      const oldHash = createHashHex(rawOldToken);
      const oldRow = {
        id: 'rt-old',
        family: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        userId: baseUser.id,
      };

      authRepository.findRefreshTokenByHash.mockImplementation((hash: string) =>
        Promise.resolve(hash === oldHash ? oldRow : { id: 'rt-new' }),
      );
      authRepository.findAuthableUserById.mockResolvedValue(baseUser);
      authRepository.createRefreshToken.mockResolvedValue({ id: 'rt-new' });

      const result = await service.refresh(rawOldToken, '127.0.0.1');

      expect(result.accessToken).toBe('signed.access.token');
      expect(authRepository.createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ family: 'family-1', userId: baseUser.id }),
      );
      expect(authRepository.revokeRefreshToken).toHaveBeenCalledWith(
        'rt-old',
        'rt-new',
      );
      expect(authRepository.revokeFamily).not.toHaveBeenCalled();
    });

    it('revokes the entire family when a rotated token is replayed', async () => {
      const reusedRow = {
        id: 'rt-reused',
        family: 'family-2',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        userId: baseUser.id,
      };
      authRepository.findRefreshTokenByHash.mockResolvedValue(reusedRow);

      await expect(
        service.refresh('stolen-token', '127.0.0.1'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(authRepository.revokeFamily).toHaveBeenCalledWith('family-2');
      expect(authRepository.createRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects an expired refresh token without touching the family', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue({
        id: 'rt-expired',
        family: 'family-3',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        userId: baseUser.id,
      });

      await expect(
        service.refresh('expired-token', '127.0.0.1'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(authRepository.revokeFamily).not.toHaveBeenCalled();
    });

    it('rejects a token that was never issued', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue(null);

      await expect(
        service.refresh('bogus-token', '127.0.0.1'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes the session family for a known token', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue({
        id: 'rt-1',
        family: 'family-1',
      });

      await service.logout('some-raw-token');

      expect(authRepository.revokeFamily).toHaveBeenCalledWith('family-1');
    });

    it('is a no-op when no token is provided', async () => {
      await service.logout(undefined);

      expect(authRepository.findRefreshTokenByHash).not.toHaveBeenCalled();
      expect(authRepository.revokeFamily).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('updates the password and revokes every existing session', async () => {
      redis.consumeSingleUseToken.mockResolvedValue(baseUser.id);
      authRepository.findById.mockResolvedValue(baseUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await service.resetPassword({
        token: 'reset-token',
        newPassword: 'NewPassw0rd',
      });

      expect(authRepository.updatePassword).toHaveBeenCalledWith(
        baseUser.id,
        'new-hashed-password',
      );
      expect(authRepository.revokeAllTokensForUser).toHaveBeenCalledWith(
        baseUser.id,
      );
    });

    it('rejects an invalid or expired token', async () => {
      redis.consumeSingleUseToken.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'bad-token',
          newPassword: 'NewPassw0rd',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(authRepository.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('marks the phone verified on a correct code', async () => {
      redis.getOtp.mockResolvedValue({ code: '123456', attempts: 0 });
      authRepository.findByPhone.mockResolvedValue(baseUser);

      const result = await service.verifyOtp({
        identifier: '+919876543210',
        code: '123456',
      });

      expect(result).toEqual({ verified: true });
      expect(authRepository.markPhoneVerified).toHaveBeenCalledWith(
        baseUser.id,
      );
    });

    it('increments attempts on an incorrect code instead of verifying', async () => {
      redis.getOtp.mockResolvedValue({ code: '123456', attempts: 0 });

      await expect(
        service.verifyOtp({ identifier: '+919876543210', code: '000000' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(redis.incrementOtpAttempts).toHaveBeenCalledWith(
        'PHONE',
        '+919876543210',
      );
      expect(authRepository.markPhoneVerified).not.toHaveBeenCalled();
    });
  });
});

function createHashHex(value: string): string {
  // Mirrors AuthService's private hashToken() implementation for test setup.
  return createHash('sha256').update(value).digest('hex');
}
