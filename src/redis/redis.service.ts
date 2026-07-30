import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/**
 * Thin wrapper over the shared Redis instance, namespaced by key prefix per
 * docs/16-REDIS-PLAN.md rather than separate `SELECT` db indices: `cache:*`, `otp:*`,
 * `ratelimit:*`. BullMQ (docs/17) manages its own connection under `bull:*` and does not
 * go through this service.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  onModuleDestroy(): void {
    this.client.disconnect();
  }

  /** Used by the health check. */
  async ping(): Promise<void> {
    const reply: string = await this.client.ping();
    if (reply !== 'PONG') {
      throw new Error(`Unexpected Redis PING reply: ${reply}`);
    }
  }

  // ---- Cache (cache:*) ----------------------------------------------------

  async getCache<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(this.cacheKey(key));
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(
      this.cacheKey(key),
      JSON.stringify(value),
      'EX',
      ttlSeconds,
    );
  }

  async delCache(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];
    if (keys.length === 0) return;
    await this.client.del(...keys.map((k) => this.cacheKey(k)));
  }

  // ---- OTP (otp:*) ----------------------------------------------------------

  async setOtp(
    channel: string,
    identifier: string,
    code: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.otpKey(channel, identifier);
    await this.client
      .multi()
      .hset(key, { code, attempts: 0 })
      .expire(key, ttlSeconds)
      .exec();
  }

  async getOtp(
    channel: string,
    identifier: string,
  ): Promise<{ code: string; attempts: number } | null> {
    const key = this.otpKey(channel, identifier);
    const data = await this.client.hgetall(key);
    if (!data.code) return null;
    return { code: data.code, attempts: Number(data.attempts ?? 0) };
  }

  async incrementOtpAttempts(
    channel: string,
    identifier: string,
  ): Promise<number> {
    return this.client.hincrby(this.otpKey(channel, identifier), 'attempts', 1);
  }

  async deleteOtp(channel: string, identifier: string): Promise<void> {
    await this.client.del(this.otpKey(channel, identifier));
  }

  async isOtpOnCooldown(identifier: string): Promise<boolean> {
    const exists = await this.client.exists(this.otpCooldownKey(identifier));
    return exists === 1;
  }

  async setOtpCooldown(identifier: string, ttlSeconds: number): Promise<void> {
    await this.client.set(
      this.otpCooldownKey(identifier),
      '1',
      'EX',
      ttlSeconds,
    );
  }

  // ---- Generic rate limiting (ratelimit:*) -----------------------------------

  /** Fixed-window counter. Returns the hit count after this increment. */
  async incrementRateLimit(
    scope: string,
    windowSeconds: number,
  ): Promise<number> {
    const key = this.rateLimitKey(scope);
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }
    return count;
  }

  /** Reads the current count without incrementing — used to reject before consuming a slot. */
  async peekRateLimit(scope: string): Promise<number> {
    const raw = await this.client.get(this.rateLimitKey(scope));
    return raw ? Number(raw) : 0;
  }

  // ---- Single-use tokens (token:*) — email verification, password reset ------

  async setSingleUseToken(
    namespace: string,
    token: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.set(
      this.tokenKey(namespace, token),
      value,
      'EX',
      ttlSeconds,
    );
  }

  /** Atomically reads and deletes the token so it can never be consumed twice. */
  async consumeSingleUseToken(
    namespace: string,
    token: string,
  ): Promise<string | null> {
    const key = this.tokenKey(namespace, token);
    const value = await this.client.get(key);
    if (value === null) return null;
    await this.client.del(key);
    return value;
  }

  private cacheKey(key: string): string {
    return `cache:${key}`;
  }

  private otpKey(channel: string, identifier: string): string {
    return `otp:${channel}:${identifier}`;
  }

  private otpCooldownKey(identifier: string): string {
    return `otp:cooldown:${identifier}`;
  }

  private rateLimitKey(scope: string): string {
    return `ratelimit:${scope}`;
  }

  private tokenKey(namespace: string, token: string): string {
    return `token:${namespace}:${token}`;
  }
}
