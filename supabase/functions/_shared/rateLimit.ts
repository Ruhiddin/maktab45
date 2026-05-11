type RateLimitRecord = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, RateLimitRecord>();

export interface FixedWindowRateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export function isRateLimited({ key, limit, windowMs }: FixedWindowRateLimitOptions): boolean {
  const now = Date.now();
  const record = buckets.get(key);

  if (!record || now - record.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }

  record.count += 1;
  return record.count > limit;
}
