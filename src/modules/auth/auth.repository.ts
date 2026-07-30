import { Injectable } from '@nestjs/common';
import type { User, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { notDeleted } from '../../prisma/soft-delete.util';

const AUTHABLE_STATUSES: UserStatus[] = ['ACTIVE', 'PENDING_VERIFICATION'];

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  family: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/** Repository layer for the Auth module — Prisma access for User + RefreshToken only. */
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findFirst({ where: notDeleted({ email }) });
  }

  findByPhone(phone: string) {
    return this.prisma.user.findFirst({ where: notDeleted({ phone }) });
  }

  findById(id: string) {
    return this.prisma.user.findFirst({ where: notDeleted({ id }) });
  }

  /** Excludes soft-deleted and banned/suspended/inactive users — used by JwtStrategy and login. */
  findAuthableUserById(id: string) {
    return this.prisma.user.findFirst({
      where: notDeleted({ id, status: { in: AUTHABLE_STATUSES } }),
    });
  }

  isAuthableStatus(status: UserStatus): boolean {
    return AUTHABLE_STATUSES.includes(status);
  }

  createUser(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: 'CUSTOMER',
        status: 'PENDING_VERIFICATION',
      },
    });
  }

  markEmailVerified(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
    });
  }

  markPhoneVerified(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { phoneVerifiedAt: new Date() },
    });
  }

  updatePassword(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  updateLastLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  createRefreshToken(input: CreateRefreshTokenInput) {
    return this.prisma.refreshToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        family: input.family,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  findRefreshTokenByHash(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: notDeleted({ tokenHash }),
    });
  }

  revokeRefreshToken(id: string, replacedBy?: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedBy },
    });
  }

  /** Revokes every non-revoked token in a rotation family — used on reuse detection, logout, and password reset. */
  revokeFamily(family: string) {
    return this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revokes every family belonging to a user — used on password reset ("log out everywhere"). */
  revokeAllTokensForUser(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
