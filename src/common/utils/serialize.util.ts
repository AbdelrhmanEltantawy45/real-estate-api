import { Prisma } from '@prisma/client';

/**
 * Keys that must never be serialized into an API response, even if they slip
 * into a query result through an include. This is a defence-in-depth measure;
 * services also avoid selecting these fields in the first place.
 */
const STRIP_KEYS = new Set(['passwordHash', 'tokenHash', 'refreshToken', 'password']);

const SENSITIVE_USER_KEYS = new Set([
  'passwordHash',
  'refreshTokens',
  'passwordResetTokens',
  'emailVerificationTokens',
  'auditLogs',
]);

/** Strip sensitive fields from a user record before returning it. */
export function toSafeUser<T extends Record<string, any>>(user: T): Partial<T> {
  if (!user) return user;
  const safe: Record<string, any> = {};
  for (const [key, value] of Object.entries(user)) {
    if (!SENSITIVE_USER_KEYS.has(key)) safe[key] = value;
  }
  return safe as Partial<T>;
}

/**
 * Recursively normalize a Prisma payload for JSON serialization:
 *  - Prisma.Decimal -> number
 *  - Date -> ISO string
 *  - drop sensitive keys anywhere in the tree
 */
export function normalizePayload(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => normalizePayload(item));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (STRIP_KEYS.has(key)) continue;
      out[key] = normalizePayload(val);
    }
    return out;
  }
  return value;
}
