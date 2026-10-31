import { randomBytes } from 'crypto';
import slugifyLib from 'slugify';

export function slugify(value: string): string {
  const slug = slugifyLib(value, { lower: true, strict: true, trim: true });
  return slug && slug.length > 0 ? slug : 'item';
}

export function randomSuffix(length = 6): string {
  return randomBytes(length)
    .toString('base64url')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, length)
    .toLowerCase();
}

/**
 * Returns a slug guaranteed not to collide. `exists` should resolve to true if
 * the candidate slug is already taken in the relevant table.
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let attempt = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await exists(candidate)) {
    attempt += 1;
    candidate = `${root}-${randomSuffix(6)}`;
    if (attempt > 12) candidate = `${root}-${Date.now().toString(36)}`;
    if (attempt > 13) break;
  }
  return candidate;
}
