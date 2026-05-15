/**
 * Login rate limiter — called from NextAuth authorize via a shared in-memory store.
 * Since NextAuth authorize() doesn't receive the Request object,
 * we track login attempts by identifier (email/phone) in a separate map.
 */

import { checkRateLimit, rateLimits } from "./rate-limit";

/**
 * Check rate limit for login attempts.
 * Called from authorize() in auth.ts — keyed by login identifier.
 * Returns true if the attempt should be blocked.
 */
export function isLoginRateLimited(login: string): boolean {
  const normalizedKey = `login:${login.toLowerCase().trim()}`;
  const result = checkRateLimit(normalizedKey, rateLimits.login);
  return result.limited;
}
