import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomInt, createHash, randomUUID } from 'node:crypto';
import { parseDurationToMs } from '../../utils/duration.util';
import { AppConfigService } from '../../config/services/app-config.service';
import { JwtConfigService } from '../../config/services/jwt-config.service';
import { SecurityConfigService } from '../../config/services/security-config.service';
import { RedisService } from '../../redis/redis.service';
import { QUEUE_EMAIL } from '../../queue/queue.constants';
import { EMAIL_JOB_SEND } from '../../queue/processors/email.processor';
import { PermissionsService } from '../permissions/permissions.service';
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { OtpRequestDto } from './dto/otp-request.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';

// Rate-limit scopes and windows per docs/16-REDIS-PLAN.md §3.
const LOGIN_EMAIL_LIMIT = 5;
const LOGIN_IP_LIMIT = 20;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const OTP_ISSUE_LIMIT = 3;
const OTP_ISSUE_WINDOW_SECONDS = 5 * 60;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_CODE_TTL_SECONDS = 5 * 60;
const OTP_MAX_VERIFY_ATTEMPTS = 3;

const EMAIL_VERIFY_TOKEN_NAMESPACE = 'email-verify';
const EMAIL_VERIFY_TOKEN_TTL_SECONDS = 24 * 60 * 60;
const RESET_PASSWORD_TOKEN_NAMESPACE = 'reset-password';
const RESET_PASSWORD_TOKEN_TTL_SECONDS = 30 * 60;

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: User['role'];
  status: User['status'];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly permissionsService: PermissionsService,
    private readonly jwtService: JwtService,
    private readonly jwtConfig: JwtConfigService,
    private readonly securityConfig: SecurityConfigService,
    private readonly appConfig: AppConfigService,
    private readonly redis: RedisService,
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
  ) {}

  // ---- Registration & verification ------------------------------------------------

  async register(dto: RegisterDto): Promise<{ id: string; email: string }> {
    const existingEmail = await this.authRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('An account with this email already exists');
    }
    if (dto.phone) {
      const existingPhone = await this.authRepository.findByPhone(dto.phone);
      if (existingPhone) {
        throw new ConflictException(
          'An account with this phone number already exists',
        );
      }
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      this.securityConfig.bcryptSaltRounds,
    );
    const user = await this.authRepository.createUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    });

    await this.sendVerificationEmail(user);

    return { id: user.id, email: user.email };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const userId = await this.redis.consumeSingleUseToken(
      EMAIL_VERIFY_TOKEN_NAMESPACE,
      dto.token,
    );
    if (!userId) {
      throw new BadRequestException('Invalid or expired verification link');
    }
    await this.authRepository.markEmailVerified(userId);
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    const token = this.generateOpaqueToken();
    await this.redis.setSingleUseToken(
      EMAIL_VERIFY_TOKEN_NAMESPACE,
      token,
      user.id,
      EMAIL_VERIFY_TOKEN_TTL_SECONDS,
    );
    const verifyUrl = `${this.appConfig.frontendUrl}/verify-email?token=${token}`;
    await this.enqueueEmail(
      user.email,
      'Verify your email address',
      `<p>Hi ${user.firstName},</p><p>Please verify your email address to activate your account:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`,
    );
  }

  // ---- Login / refresh / logout ----------------------------------------------------

  async login(
    dto: LoginDto,
    ip: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    await this.assertNotRateLimited(dto.email, ip);

    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) {
      await this.registerLoginFailure(dto.email, ip);
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!this.authRepository.isAuthableStatus(user.status)) {
      throw new ForbiddenException(
        'This account is not active — contact support',
      );
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      await this.registerLoginFailure(dto.email, ip);
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.authRepository.updateLastLogin(user.id);
    return this.issueTokenPair(user, randomUUID(), ip, userAgent);
  }

  async refresh(
    rawRefreshToken: string,
    ip: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const tokenRow =
      await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (!tokenRow) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRow.revokedAt) {
      // Reuse of an already-rotated token — likely token theft. Revoke the whole session
      // family so both the attacker's and the legitimate user's copies stop working.
      await this.authRepository.revokeFamily(tokenRow.family);
      this.logger.warn(
        `Refresh token reuse detected for family ${tokenRow.family}`,
      );
      throw new UnauthorizedException(
        'Session invalidated — please log in again',
      );
    }

    if (tokenRow.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.authRepository.findAuthableUserById(
      tokenRow.userId,
    );
    if (!user) {
      throw new UnauthorizedException('Account no longer available');
    }

    const pair = await this.issueTokenPair(
      user,
      tokenRow.family,
      ip,
      userAgent,
    );
    const newTokenHash = this.hashToken(pair.refreshToken);
    // issueTokenPair already created the new row; look it up to link revocation metadata.
    const newTokenRow =
      await this.authRepository.findRefreshTokenByHash(newTokenHash);
    await this.authRepository.revokeRefreshToken(tokenRow.id, newTokenRow?.id);

    return pair;
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = this.hashToken(rawRefreshToken);
    const tokenRow =
      await this.authRepository.findRefreshTokenByHash(tokenHash);
    if (tokenRow) {
      await this.authRepository.revokeFamily(tokenRow.family);
    }
  }

  private async issueTokenPair(
    user: User,
    family: string,
    ip: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const rawRefreshToken = this.generateOpaqueToken();
    const refreshTokenExpiresAt = new Date(
      Date.now() + parseDurationToMs(this.jwtConfig.refreshTtl),
    );
    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: this.hashToken(rawRefreshToken),
      family,
      expiresAt: refreshTokenExpiresAt,
      ipAddress: ip,
      userAgent,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      refreshTokenExpiresAt,
      user: this.toPublicUser(user),
    };
  }

  // ---- Forgot / reset password -------------------------------------------------------

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.authRepository.findByEmail(dto.email);
    // Always behave the same whether or not the account exists — never reveal registration status.
    if (!user) return;

    const token = this.generateOpaqueToken();
    await this.redis.setSingleUseToken(
      RESET_PASSWORD_TOKEN_NAMESPACE,
      token,
      user.id,
      RESET_PASSWORD_TOKEN_TTL_SECONDS,
    );
    const resetUrl = `${this.appConfig.frontendUrl}/reset-password?token=${token}`;
    await this.enqueueEmail(
      user.email,
      'Reset your password',
      `<p>Hi ${user.firstName},</p><p>Click the link below to reset your password. This link expires in 30 minutes and can only be used once.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
    );
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const userId = await this.redis.consumeSingleUseToken(
      RESET_PASSWORD_TOKEN_NAMESPACE,
      dto.token,
    );
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const passwordHash = await bcrypt.hash(
      dto.newPassword,
      this.securityConfig.bcryptSaltRounds,
    );
    await this.authRepository.updatePassword(userId, passwordHash);
    // A password reset ends every existing session, on every device.
    await this.authRepository.revokeAllTokensForUser(userId);

    await this.enqueueEmail(
      user.email,
      'Your password was changed',
      `<p>Hi ${user.firstName},</p><p>Your password was just changed. If this wasn't you, contact support immediately.</p>`,
    );
  }

  // ---- OTP (phone verification) ------------------------------------------------------

  async requestOtp(dto: OtpRequestDto): Promise<void> {
    if (await this.redis.isOtpOnCooldown(dto.identifier)) {
      throw new HttpException(
        'Please wait before requesting another code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const issuedRecently = await this.redis.peekRateLimit(
      this.otpIssueScope(dto.identifier),
    );
    if (issuedRecently >= OTP_ISSUE_LIMIT) {
      throw new HttpException(
        'Too many OTP requests — try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.redis.incrementRateLimit(
      this.otpIssueScope(dto.identifier),
      OTP_ISSUE_WINDOW_SECONDS,
    );

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.redis.setOtp(
      'PHONE',
      dto.identifier,
      code,
      OTP_CODE_TTL_SECONDS,
    );
    await this.redis.setOtpCooldown(
      dto.identifier,
      OTP_RESEND_COOLDOWN_SECONDS,
    );

    if (this.appConfig.isProduction) {
      this.logger.warn(
        `OTP requested for ${dto.identifier} but no SMS provider is configured — code was not delivered`,
      );
    } else {
      // No SMS provider is wired up (none was specified in the stack) — logging the code is
      // the dev-mode equivalent of MailService's "log instead of send" fallback.
      this.logger.log(`[DEV ONLY] OTP for ${dto.identifier}: ${code}`);
    }
  }

  async verifyOtp(dto: OtpVerifyDto): Promise<{ verified: boolean }> {
    const record = await this.redis.getOtp('PHONE', dto.identifier);
    if (!record) {
      throw new BadRequestException(
        'No pending verification for this number, or it has expired',
      );
    }
    if (record.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      await this.redis.deleteOtp('PHONE', dto.identifier);
      throw new BadRequestException(
        'Too many incorrect attempts — request a new code',
      );
    }
    if (record.code !== dto.code) {
      await this.redis.incrementOtpAttempts('PHONE', dto.identifier);
      throw new BadRequestException('Incorrect code');
    }

    await this.redis.deleteOtp('PHONE', dto.identifier);
    const user = await this.authRepository.findByPhone(dto.identifier);
    if (user) {
      await this.authRepository.markPhoneVerified(user.id);
    }
    return { verified: true };
  }

  // ---- Profile ------------------------------------------------------------------------

  async getProfile(
    userId: string,
  ): Promise<PublicUser & { permissions: string[] }> {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const permissions =
      await this.permissionsService.resolveEffectivePermissions(
        user.id,
        user.role,
      );
    return { ...this.toPublicUser(user), permissions };
  }

  // ---- Helpers ------------------------------------------------------------------------

  private async assertNotRateLimited(email: string, ip: string): Promise<void> {
    const [emailCount, ipCount] = await Promise.all([
      this.redis.peekRateLimit(this.loginEmailScope(email)),
      this.redis.peekRateLimit(this.loginIpScope(ip)),
    ]);
    if (emailCount >= LOGIN_EMAIL_LIMIT || ipCount >= LOGIN_IP_LIMIT) {
      throw new HttpException(
        'Too many login attempts — try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async registerLoginFailure(email: string, ip: string): Promise<void> {
    await Promise.all([
      this.redis.incrementRateLimit(
        this.loginEmailScope(email),
        LOGIN_WINDOW_SECONDS,
      ),
      this.redis.incrementRateLimit(
        this.loginIpScope(ip),
        LOGIN_WINDOW_SECONDS,
      ),
    ]);
  }

  private loginEmailScope(email: string): string {
    return `login:email:${email}`;
  }

  private loginIpScope(ip: string): string {
    return `login:ip:${ip}`;
  }

  private otpIssueScope(identifier: string): string {
    return `otp:issue:${identifier}`;
  }

  private async enqueueEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    await this.emailQueue.add(EMAIL_JOB_SEND, { to, subject, html });
  }

  private generateOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
    };
  }
}
