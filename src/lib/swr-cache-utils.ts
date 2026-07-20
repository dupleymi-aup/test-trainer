/**
 * Configuration for SWR cache hydration
 * Used to pass server-side fetched data to client
 */
export interface SWRCachePayload {
  [key: string]: unknown;
}

/**
 * Create SWR cache payload from server-side data
 * Usage in server component:
 * ```tsx
 * const cache = createSWRCache({
 *   "/api/users": await fetchUsers(),
 *   "/api/stats": await fetchStats(),
 * });
 * ```
 */
export function createSWRCache(data: Record<string, unknown>): SWRCachePayload {
  return data;
}

/**
 * Hydrate SWR cache with server-side data
 * Call in client component after SWR initialization
 */
export function hydrateSWRCache(
  cache: Record<string, unknown>,
  data: SWRCachePayload
): void {
  Object.entries(data).forEach(([key, value]) => {
    cache[key] = value;
  });
}

/**
 * Generate cache key from params
 */
export function generateCacheKey(base: string, params?: Record<string, string | number>): string {
  if (!params) return base;
  
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });
  
  const query = searchParams.toString();
  return query ? `${base}?${query}` : base;
}

/**
 * Serialize cache key for SWR
 */
export function serializeKey(key: string): string {
  return key;
}

/**
 * Invalidate cache by pattern
 * Usage: invalidateCacheByPattern("/api/student/")
 */
export function invalidateCacheByPattern(
  cache: Map<unknown, unknown>,
  pattern: string
): void {
  cache.forEach((_, key) => {
    if (typeof key === "string" && key.startsWith(pattern)) {
      cache.delete(key);
    }
  });
}

/**
 * Clear all student-related caches
 */
export function clearStudentCaches(cache: Map<unknown, unknown>): void {
  invalidateCacheByPattern(cache, "/api/student/");
}
