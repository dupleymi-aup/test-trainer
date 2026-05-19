import { describe, it, expect } from "vitest";
import { generateSecureToken, generateSecureOTP } from "./crypto";

describe("generateSecureToken", () => {
  it("generates a hex string of correct length (default 32 bytes = 64 chars)", () => {
    const token = generateSecureToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBe(64);
  });

  it("generates tokens of specified length", () => {
    const token = generateSecureToken(16);
    expect(token.length).toBe(32); // 16 bytes = 32 hex chars
  });

  it("generates only hex characters", () => {
    const token = generateSecureToken();
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it("generates unique tokens", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateSecureToken());
    }
    expect(tokens.size).toBe(100);
  });

  it("generates different tokens for different calls", () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();
    expect(token1).not.toBe(token2);
  });

  it("works with length 1", () => {
    const token = generateSecureToken(1);
    expect(token.length).toBe(2); // 1 byte = 2 hex chars
  });

  it("works with length 0", () => {
    const token = generateSecureToken(0);
    expect(token.length).toBe(0);
  });
});

describe("generateSecureOTP", () => {
  it("generates a 6-digit string", () => {
    const otp = generateSecureOTP();
    expect(typeof otp).toBe("string");
    expect(otp.length).toBe(6);
  });

  it("generates only digits", () => {
    const otp = generateSecureOTP();
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it("can generate leading zeros", () => {
    // Run many times to increase chance of hitting small numbers
    const otps = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      otps.add(generateSecureOTP());
    }
    // All should be 6 chars
    for (const otp of otps) {
      expect(otp.length).toBe(6);
    }
  });

  it("generates values in range 000000-999999", () => {
    for (let i = 0; i < 100; i++) {
      const otp = generateSecureOTP();
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThan(1_000_000);
    }
  });

  it("generates varied OTPs", () => {
    const otps = new Set<string>();
    for (let i = 0; i < 50; i++) {
      otps.add(generateSecureOTP());
    }
    // Should have variety (not always the same)
    expect(otps.size).toBeGreaterThan(1);
  });
});
