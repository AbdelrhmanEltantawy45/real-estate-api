import { createHash, randomBytes } from 'crypto';

/** Cryptographically strong random hex token. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** SHA-256 hash for storing opaque tokens (refresh, password reset) at rest. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
