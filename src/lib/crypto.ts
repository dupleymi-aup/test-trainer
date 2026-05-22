/**
 * Cryptographic utilities for secure token generation
 *
 * Replaces insecure base64 encoding of predictable values with
 * cryptographically secure random token generation.
 */

import { randomBytes } from "crypto";

/**
 * Generate a cryptographically secure random token.
 *
 * Default 32 bytes = 64 hex characters, suitable for
 * verification tokens, password reset tokens, etc.
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

/**
 * Generate a 6-digit numeric OTP code.
 *
 * Uses crypto.randomBytes instead of Math.random() for security.
 */
export function generateSecureOTP(): string {
  // Generate a number between 0 and 999999, then pad with leading zeros
  const buffer = randomBytes(3); // 3 bytes = 24 bits = up to 16,777,215
  const num = buffer.readUIntBE(0, 3) % 1_000_000;
  return String(num).padStart(6, "0");
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Use this when comparing secrets, tokens, or passwords.
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
