import type { CookieOptions } from 'express';

/**
 * Refresh-token cookie contract (shared by controller + docs).
 *
 * The refresh token travels ONLY in this httpOnly cookie (never in the JSON
 * body). `path` is scoped to the auth routes so it is not attached to every API
 * request. It must exactly match the path used when clearing the cookie, or the
 * browser will not remove it.
 */
export const REFRESH_COOKIE_NAME = 'refreshToken';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

/** Parse a JWT-style TTL string ("7d", "15m", "24h", "3600s") into milliseconds. */
export function ttlToMs(ttl: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(ttl.trim());
  if (!match) {
    const bare = Number(ttl);
    if (!Number.isNaN(bare)) return bare * 1000; // bare number = seconds
    throw new Error(`Invalid TTL format: "${ttl}"`);
  }
  const value = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multiplier: Record<'s' | 'm' | 'h' | 'd', number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multiplier[unit];
}

export function refreshCookieOptions(opts: {
  secure: boolean;
  maxAgeMs: number;
}): CookieOptions {
  return {
    httpOnly: true,
    secure: opts.secure,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: opts.maxAgeMs,
  };
}

/** Options for clearing — must mirror everything except maxAge. */
export function clearRefreshCookieOptions(opts: { secure: boolean }): CookieOptions {
  return {
    httpOnly: true,
    secure: opts.secure,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
  };
}
