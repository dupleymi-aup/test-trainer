/**
 * CSRF protection using Double Submit Cookie pattern.
 * Safe for stateless APIs — no server-side session storage needed.
 * Uses Web Crypto API for Edge Runtime compatibility.
 */

import { secureCompare } from "./crypto";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a cryptographically secure CSRF token using Web Crypto API.
 */
export function generateCSRFToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify that the CSRF token in the cookie matches the header.
 * Returns true if valid, false otherwise.
 */
export function verifyCSRFToken(cookieToken: string | undefined, headerToken: string | undefined): boolean {
  if (!cookieToken || !headerToken) return false;
  return secureCompare(cookieToken, headerToken);
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
