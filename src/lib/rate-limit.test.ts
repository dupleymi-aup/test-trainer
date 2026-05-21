import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit, createRateLimitResponse, cleanupExpiredEntries, getClientIp } from "./rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
});

describe("checkRateLimit", () => {
  it("allows first request", () => {
    const result = checkRateLimit("test-key", { max: 3, windowMs: 60000 });
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(2);
  });

  it("allows requests up to max", () => {
    const config = { max: 3, windowMs: 60000 };
    const r1 = checkRateLimit("burst-key", config);
    const r2 = checkRateLimit("burst-key", config);
    const r3 = checkRateLimit("burst-key", config);
    expect(r1.limited).toBe(false);
    expect(r2.limited).toBe(false);
    expect(r3.limited).toBe(false);
  });

  it("blocks request after max is exceeded", () => {
    const config = { max: 2, windowMs: 60000 };
    checkRateLimit("block-key", config);
    checkRateLimit("block-key", config);
    const r3 = checkRateLimit("block-key", config);
    expect(r3.limited).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    const config = { max: 2, windowMs: 60000 };
    checkRateLimit("reset-key", config);
    checkRateLimit("reset-key", config);
    const r3 = checkRateLimit("reset-key", config);
    expect(r3.limited).toBe(true);

    // Advance past window
    vi.advanceTimersByTime(61000);
    const r4 = checkRateLimit("reset-key", config);
    expect(r4.limited).toBe(false);
    expect(r4.remaining).toBe(1);
  });

  it("tracks different keys independently", () => {
    const config = { max: 1, windowMs: 60000 };
    const r1a = checkRateLimit("key-a", config);
    const r1b = checkRateLimit("key-b", config);
    expect(r1a.limited).toBe(false);
    expect(r1b.limited).toBe(false);

    const r2a = checkRateLimit("key-a", config);
    const r2b = checkRateLimit("key-b", config);
    expect(r2a.limited).toBe(true);
    expect(r2b.limited).toBe(true);
  });
});

describe("cleanupExpiredEntries", () => {
  it("removes expired entries from store", () => {
    const config = { max: 5, windowMs: 1000 };
    checkRateLimit("cleanup-key", config);
    vi.advanceTimersByTime(2000);
    cleanupExpiredEntries();

    // After cleanup, a new request should start fresh
    const result = checkRateLimit("cleanup-key", config);
    expect(result.remaining).toBe(4); // max - 1 = 4
  });
});

describe("createRateLimitResponse", () => {
  it("returns 429 status with Retry-After header", () => {
    const resetAt = Date.now() + 5000;
    const response = createRateLimitResponse(resetAt);
    expect(response.status).toBe(429);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Retry-After")).toBeDefined();
  });

  it("clamps negative retry-after to minimum 1 second", () => {
    const resetAt = Date.now() - 5000; // Already passed
    const response = createRateLimitResponse(resetAt);
    const retryAfter = parseInt(response.headers.get("Retry-After") || "0");
    expect(retryAfter).toBeGreaterThanOrEqual(1);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const req = new Request("http://test.com", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("192.168.1.1");
  });

  it("extracts IP from x-real-ip header", () => {
    const req = new Request("http://test.com", {
      headers: { "x-real-ip": "10.0.0.2" },
    });
    expect(getClientIp(req)).toBe("10.0.0.2");
  });

  it("returns 'unknown' when no IP headers present", () => {
    const req = new Request("http://test.com");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = new Request("http://test.com", {
      headers: { "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });
});
