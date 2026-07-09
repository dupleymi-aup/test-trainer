import { describe, it, expect, beforeEach, vi } from "vitest";
import { isEmailRateLimited, cleanupEmailRateLimitStore, resetEmailRateLimitStore } from "./email-rate-limit";

describe("isEmailRateLimited", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetEmailRateLimitStore();
  });

  it("allows first request for a new email", () => {
    expect(isEmailRateLimited("fresh@test.com")).toBe(false);
  });

  it("allows up to max requests (3 per 15 min)", () => {
    for (let i = 0; i < 3; i++) {
      expect(isEmailRateLimited("allowed@test.com")).toBe(false);
    }
  });

  it("blocks after max requests exceeded", () => {
    for (let i = 0; i < 3; i++) {
      isEmailRateLimited("blocked@test.com");
    }
    expect(isEmailRateLimited("blocked@test.com")).toBe(true);
  });

  it("normalizes email (lowercase, trimmed)", () => {
    isEmailRateLimited("Test@Test.COM"); // count=1
    isEmailRateLimited(" test@test.com "); // count=2 (same normalized key)
    isEmailRateLimited("test@test.com"); // count=3
    expect(isEmailRateLimited("test@test.com")).toBe(true); // count=4 → blocked
  });

  it("tracks different emails independently", () => {
    for (let i = 0; i < 3; i++) {
      isEmailRateLimited("alpha@test.com");
    }
    expect(isEmailRateLimited("alpha@test.com")).toBe(true);
    expect(isEmailRateLimited("beta@test.com")).toBe(false);
  });

  it("resets after window expires", () => {
    for (let i = 0; i < 3; i++) {
      isEmailRateLimited("window@test.com");
    }
    expect(isEmailRateLimited("window@test.com")).toBe(true);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
    expect(isEmailRateLimited("window@test.com")).toBe(false);
  });
});

describe("cleanupEmailRateLimitStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetEmailRateLimitStore();
  });

  it("returns 0 when store is empty", () => {
    expect(cleanupEmailRateLimitStore()).toBe(0);
  });

  it("removes expired entries", () => {
    isEmailRateLimited("cleanup@test.com");
    expect(cleanupEmailRateLimitStore()).toBe(0); // not expired yet

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(cleanupEmailRateLimitStore()).toBe(1);
  });

  it("does not remove entries within window", () => {
    isEmailRateLimited("active@test.com");
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(cleanupEmailRateLimitStore()).toBe(0);
  });
});
