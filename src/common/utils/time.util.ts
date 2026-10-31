const DURATION_MULTIPLIERS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

/** Parse a human duration string ('7d', '15m', '3600s') or a number of ms. */
export function parseDurationToMs(value: string | number): number {
  if (typeof value === 'number') return value;
  const trimmed = value.trim();
  const match = /^(\d+)\s*(ms|s|m|h|d|w)$/.exec(trimmed);
  if (!match) {
    const asNumber = parseInt(trimmed, 10);
    return Number.isFinite(asNumber) ? asNumber : 0;
  }
  const n = parseInt(match[1], 10);
  return n * (DURATION_MULTIPLIERS[match[2]] ?? 0);
}

/** Returns a Date offset from `from` (default now) by the given duration. */
export function expiryDate(value: string | number, from: Date = new Date()): Date {
  return new Date(from.getTime() + parseDurationToMs(value));
}
