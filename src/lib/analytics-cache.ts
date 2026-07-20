interface CacheEntry {
  data: unknown;
  expires: number;
  createdAt: number;
}

// Maximum cache entries before oldest are evicted
const MAX_CACHE_SIZE = 1000;

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL = {
  expensive: 5 * 60 * 1000, // 5 min for heavy aggregations
  medium: 3 * 60 * 1000,    // 3 min for medium queries
  simple: 1 * 60 * 1000,    // 1 min for simple counts
  short: 30 * 1000,         // 30 sec for frequently changing data
};

function hashParams(params: Record<string, unknown>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${String(params[k] ?? "")}`)
    .join("&");
}

export function makeCacheKey(route: string, params: Record<string, unknown> = {}): string {
  return params && Object.keys(params).length
    ? `analytics:${route}:${hashParams(params)}`
    : `analytics:${route}`;
}

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlMs: number = DEFAULT_TTL.medium): void {
  if (ttlMs <= 0) return; // Reject invalid TTLs

  // Evict oldest entry if at capacity
  if (!cache.has(key) && cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next();
    if (!firstKey.done) cache.delete(firstKey.value);
  }

  cache.set(key, { data, expires: Date.now() + ttlMs, createdAt: Date.now() });
}

export function invalidateCache(pattern: string): number {
  let count = 0;
  // Escape all regex metacharacters first, then convert * to wildcard
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const regex = new RegExp("^" + escaped + "$");
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
      count++;
    }
  }
  return count;
}

export function clearCache(): void {
  cache.clear();
}

export function getCacheStats(): { size: number; keys: string[] } {
  const now = Date.now();
  // Clean expired entries
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expires) cache.delete(key);
  }
  return { size: cache.size, keys: [...cache.keys()] };
}

// Periodic cleanup every 2 minutes — singleton guard to prevent HMR leaks
if (typeof global !== "undefined") {
  const cacheCleanupSymbol = Symbol.for("analytics-cache-cleanup-interval");
  const existingInterval = (global as Record<symbol, unknown>)[cacheCleanupSymbol] as ReturnType<typeof setInterval> | undefined;
  if (existingInterval) clearInterval(existingInterval);
  (global as Record<symbol, unknown>)[cacheCleanupSymbol] = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expires) cache.delete(key);
    }
  }, 2 * 60 * 1000);
}

export { DEFAULT_TTL, MAX_CACHE_SIZE };
