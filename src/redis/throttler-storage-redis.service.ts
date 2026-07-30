import { Inject, Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/**
 * Redis-backed ThrottlerStorage so rate-limit counters are shared across the PM2 cluster
 * workers instead of living per-process (see docs/16-REDIS-PLAN.md §3) — an in-memory
 * limiter would be trivially bypassed by hitting a different worker on each request.
 *
 * Atomicity (check-block, increment, set-block) is done in a single Lua script to avoid
 * race conditions between concurrent requests hammering the same key.
 */
const INCREMENT_SCRIPT = `
local hitKey = KEYS[1]
local blockKey = KEYS[2]
local ttlMs = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDurationMs = tonumber(ARGV[3])

local blockPttl = redis.call('PTTL', blockKey)
if blockPttl > 0 then
  return {limit + 1, 0, 1, blockPttl}
end

local totalHits = redis.call('INCR', hitKey)
if totalHits == 1 then
  redis.call('PEXPIRE', hitKey, ttlMs)
end
local pttl = redis.call('PTTL', hitKey)

local isBlocked = 0
local blockPttlOut = 0
if totalHits > limit then
  isBlocked = 1
  if blockDurationMs > 0 then
    redis.call('SET', blockKey, '1', 'PX', blockDurationMs)
    blockPttlOut = blockDurationMs
  end
end

return {totalHits, pttl, isBlocked, blockPttlOut}
`;

@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `throttler:${throttlerName}:${key}`;
    const blockKey = `${hitKey}:blocked`;

    const [totalHits, pttl, isBlocked, blockPttl] = (await this.client.eval(
      INCREMENT_SCRIPT,
      2,
      hitKey,
      blockKey,
      ttl,
      limit,
      blockDuration,
    )) as [number, number, number, number];

    return {
      totalHits,
      timeToExpire: Math.ceil(pttl / 1000),
      isBlocked: isBlocked === 1,
      timeToBlockExpire: Math.ceil(blockPttl / 1000),
    };
  }
}
