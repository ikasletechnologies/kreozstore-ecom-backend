const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Parses a short duration string ("15m", "30d", "900s") into milliseconds. Used wherever an
 * env-configured TTL (e.g. JWT_REFRESH_TTL) needs to become a concrete `maxAge` for a cookie —
 * `jsonwebtoken`/`@nestjs/jwt` accept these strings natively for `expiresIn`, but `res.cookie()`
 * needs a number.
 */
export function parseDurationToMs(input: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(input.trim());
  if (!match) {
    throw new Error(
      `Invalid duration string: "${input}" (expected e.g. "15m", "30d")`,
    );
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_TO_MS[unit];
}
