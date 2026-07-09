/**
 * In-memory rate limiter for email-based operations (forgot password, magic links).
 * Keyed by normalized email address. Separate from IP-based rate limiting
 * because the same IP may serve multiple users.
 */

import { rateLimits } from "./rate-limit";

const store = new Map<string, { count: number; resetAt: number }>();
const MAX_STORE_SIZE = 10_000;

export function isEmailRateLimited(email: string): boolean {
  const now = Date.now();
  const key = `email:${email.toLowerCase().trim()}`;
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.delete(key);
    store.set(key, { count: 1, resetAt: now + rateLimits.forgotPassword.windowMs });
    return false;
  }

  if (entry.count >= rateLimits.forgotPassword.max) {
    return true;
  }

  entry.count += 1;
  return false;
}

/** Reset store — for test isolation only */
export function resetEmailRateLimitStore(): void {
  store.clear();
}

export function cleanupEmailRateLimitStore(): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
      cleaned++;
    }
  }
  if (store.size > MAX_STORE_SIZE) {
    const iterator = store.keys();
    const evictCount = Math.min(500, store.size - MAX_STORE_SIZE);
    for (let i = 0; i < evictCount; i++) {
      const result = iterator.next();
      if (result.done) break;
      store.delete(result.value);
    }
  }
  return cleaned;
}

// Auto-cleanup every 1 minute — singleton guard to prevent HMR leaks
if (typeof global !== "undefined") {
  const emailRateLimitCleanupSymbol = Symbol.for("email-rate-limit-cleanup-interval");
  const existingInterval = (global as Record<symbol, unknown>)[emailRateLimitCleanupSymbol] as ReturnType<typeof setInterval> | undefined;
  if (existingInterval) clearInterval(existingInterval);
  (global as Record<symbol, unknown>)[emailRateLimitCleanupSymbol] = setInterval(cleanupEmailRateLimitStore, 60 * 1000);
}
