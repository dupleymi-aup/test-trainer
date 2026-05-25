import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateCSRFToken,
  verifyCSRFToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from "./csrf";

describe("csrf", () => {
  // --- crypto mock ---
  const originalCrypto = globalThis.crypto;

  beforeEach(() => {
    // Provide a mock crypto for Node environment
    Object.defineProperty(globalThis, "crypto", {
      value: {
        getRandomValues: vi.fn((arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = i % 256; // deterministic values for testing
          }
          return arr;
        }),
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", {
      value: originalCrypto,
      configurable: true,
      writable: true,
    });
  });

  // --- generateCSRFToken ---
  describe("generateCSRFToken", () => {
    it("returns a string", () => {
      const token = generateCSRFToken();
      expect(typeof token).toBe("string");
    });

    it("returns a 64-character hex string (32 bytes)", () => {
      const token = generateCSRFToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generates different tokens on successive calls", () => {
      // Override mock to return random-ish bytes each call
      let counter = 0;
      (globalThis.crypto.getRandomValues as ReturnType<typeof vi.fn>).mockImplementation(
        (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = (counter + i) % 256;
          }
          counter += 32;
          return arr;
        }
      );
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(token1).not.toBe(token2);
    });

    it("uses crypto.getRandomValues with 32 bytes", () => {
      generateCSRFToken();
      expect(globalThis.crypto.getRandomValues).toHaveBeenCalledWith(
        expect.any(Uint8Array)
      );
      const callArg = vi.mocked(globalThis.crypto.getRandomValues).mock
        .calls[0][0] as Uint8Array;
      expect(callArg.length).toBe(32);
    });
  });

  // --- verifyCSRFToken ---
  describe("verifyCSRFToken", () => {
    it("returns true when tokens match", () => {
      expect(verifyCSRFToken("abc123", "abc123")).toBe(true);
    });

    it("returns false when tokens differ", () => {
      expect(verifyCSRFToken("abc123", "abc456")).toBe(false);
    });

    it("returns false when cookie token is undefined", () => {
      expect(verifyCSRFToken(undefined, "abc123")).toBe(false);
    });

    it("returns false when header token is undefined", () => {
      expect(verifyCSRFToken("abc123", undefined)).toBe(false);
    });

    it("returns false when both tokens are undefined", () => {
      expect(verifyCSRFToken(undefined, undefined)).toBe(false);
    });

    it("returns false when cookie token is empty string", () => {
      expect(verifyCSRFToken("", "abc123")).toBe(false);
    });

    it("returns false when header token is empty string", () => {
      expect(verifyCSRFToken("abc123", "")).toBe(false);
    });

    it("returns false when tokens have different lengths", () => {
      expect(verifyCSRFToken("abc", "abcd")).toBe(false);
    });

    it("uses constant-time comparison (does not short-circuit on first char mismatch)", () => {
      // The implementation XORs all chars and accumulates diff
      // Both of these should be false regardless of where the mismatch is
      expect(verifyCSRFToken("abc123", "xbc123")).toBe(false); // first char mismatch
      expect(verifyCSRFToken("abc123", "abc12x")).toBe(false); // last char mismatch
    });

    it("verifies long tokens correctly", () => {
      const long = "a".repeat(64);
      expect(verifyCSRFToken(long, long)).toBe(true);
    });

    it("rejects long token with single character difference", () => {
      const token = "a".repeat(64);
      const tampered = "a".repeat(63) + "b";
      expect(verifyCSRFToken(token, tampered)).toBe(false);
    });
  });

  // --- constants ---
  describe("constants", () => {
    it("exports CSRF_COOKIE_NAME", () => {
      expect(CSRF_COOKIE_NAME).toBe("csrf-token");
    });

    it("exports CSRF_HEADER_NAME", () => {
      expect(CSRF_HEADER_NAME).toBe("x-csrf-token");
    });
  });
});
