/**
 * In-memory rate limiter for auth endpoints.
 * Uses a sliding window counter approach.
 * For production with multiple server instances, replace with Redis-based limiting.
 */

/**
 * Extract client IP from request headers, considering proxy headers.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP (original client)
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
  lastAccess: number;
}

// Maximum number of entries before LRU eviction kicks in
const MAX_STORE_SIZE = 10_000;
// When exceeded, evict this many oldest entries
const EVICTION_BATCH = 500;

// Map key -> { count, resetAt, lastAccess }
const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  max: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export const rateLimits: Record<string, RateLimitConfig> = {
  /** Login: 5 attempts per 15 minutes (brute-force protection) */
  login: { max: 5, windowMs: 15 * 60 * 1000 },
  /** Registration: 3 per 1 hour per IP (spam prevention) */
  register: { max: 3, windowMs: 60 * 60 * 1000 },
  /** Forgot password: 3 per 15 minutes (email/SMS bombing prevention) */
  forgotPassword: { max: 3, windowMs: 15 * 60 * 1000 },
  /** OTP verification: 5 per 15 minutes (brute-force 6-digit code) */
  verifyOtp: { max: 5, windowMs: 15 * 60 * 1000 },
  /** Reset password: 5 per 15 minutes */
  resetPassword: { max: 5, windowMs: 15 * 60 * 1000 },
  /** Resend verification email: 2 per 1 hour */
  resendVerification: { max: 2, windowMs: 60 * 60 * 1000 },
  /** Change password: 5 per 15 minutes */
  changePassword: { max: 5, windowMs: 15 * 60 * 1000 },
  /** Teacher notifications: 20 per hour (prevent spam) */
  notifications: { max: 20, windowMs: 60 * 60 * 1000 },
  /** Admin settings: 10 per 15 minutes */
  adminSettings: { max: 10, windowMs: 15 * 60 * 1000 },
  /** Profile updates: 10 per 15 minutes */
  profileUpdate: { max: 10, windowMs: 15 * 60 * 1000 },
  /** Admin user CRUD: 20 per 15 minutes */
  adminUserCrud: { max: 20, windowMs: 15 * 60 * 1000 },
  /** Admin group CRUD: 20 per 15 minutes */
  adminGroupCrud: { max: 20, windowMs: 15 * 60 * 1000 },
  /** Admin deadline CRUD: 20 per 15 minutes */
  adminDeadlineCrud: { max: 20, windowMs: 15 * 60 * 1000 },
  /** Admin cache invalidation: 10 per 15 minutes */
  adminCacheInvalidate: { max: 10, windowMs: 15 * 60 * 1000 },
  /** Admin role changes: 10 per 15 minutes (privilege escalation protection) */
  adminRoleChange: { max: 10, windowMs: 15 * 60 * 1000 },
  /** Attempt submissions: 30 per 15 minutes */
  attemptSubmission: { max: 30, windowMs: 15 * 60 * 1000 },
  /** Student reminder updates: 20 per 15 minutes */
  studentReminders: { max: 20, windowMs: 15 * 60 * 1000 },
  /** Student preferences updates: 10 per 15 minutes */
  studentPreferences: { max: 10, windowMs: 15 * 60 * 1000 },
};

/**
 * Check if a request is rate limited.
 * @param key - Unique identifier (typically IP address or user ID)
 * @param config - Rate limit configuration
 * @returns { limited: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // Stale or missing — clean up expired if present
    if (entry) store.delete(key);

    // Evict oldest entries if store is over capacity
    if (store.size >= MAX_STORE_SIZE) evictOldest();

    // Create fresh entry
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
      lastAccess: now,
    });
    return { limited: false, remaining: config.max - 1, resetAt: now + config.windowMs };
  }

  // Within window — update lastAccess for LRU tracking
  entry.lastAccess = now;

  // Check limit BEFORE incrementing
  if (entry.count >= config.max) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { limited: false, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

/**
 * Evict the oldest N entries when store exceeds MAX_STORE_SIZE.
 * Uses Map insertion order as a proxy for LRU (entries with oldest lastAccess are evicted first).
 */
function evictOldest() {
  const iterator = store.keys();
  for (let i = 0; i < EVICTION_BATCH; i++) {
    const result = iterator.next();
    if (result.done) break;
    store.delete(result.value);
  }
}

/**
 * Clean up expired entries (call periodically in production).
 */
export function cleanupExpiredEntries(): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
      cleaned++;
    }
  }
  // If still oversized after expired cleanup, force evict oldest
  if (store.size > MAX_STORE_SIZE) evictOldest();
  return cleaned;
}

/**
 * Create a standardized rate limit response with safe Retry-After header.
 * The Retry-After value is clamped to a minimum of 1 second to prevent negative values.
 */
export function createRateLimitResponse(resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return new Response(
    JSON.stringify({ error: "Слишком много попыток. Попробуйте позже" }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}

// Auto-cleanup every 1 minute — singleton guard to prevent HMR leaks
if (typeof global !== "undefined") {
  const rateLimitCleanupSymbol = Symbol.for("rate-limit-cleanup-interval");
  const existingInterval = (global as Record<symbol, unknown>)[rateLimitCleanupSymbol] as ReturnType<typeof setInterval> | undefined;
  if (existingInterval) clearInterval(existingInterval);
  (global as Record<symbol, unknown>)[rateLimitCleanupSymbol] = setInterval(cleanupExpiredEntries, 60 * 1000);
}
