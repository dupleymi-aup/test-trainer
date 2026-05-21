import { describe, it, expect, vi, beforeEach } from "vitest";
import { isLoginRateLimited } from "./login-rate-limit";
import { checkRateLimit, rateLimits } from "./rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
});

describe("isLoginRateLimited", () => {
  it("allows first few login attempts", () => {
    expect(isLoginRateLimited("test1-user@test.com")).toBe(false);
    expect(isLoginRateLimited("test1-user@test.com")).toBe(false);
    expect(isLoginRateLimited("test1-user@test.com")).toBe(false);
  });

  it("blocks after max attempts (5 per 15 min)", () => {
    for (let i = 0; i < 5; i++) {
      isLoginRateLimited("test2-blocked@test.com");
    }
    expect(isLoginRateLimited("test2-blocked@test.com")).toBe(true);
  });

  it("normalizes login identifier (case insensitive, trimmed)", () => {
    const baseEmail = "test3-normalize@test.com";
    // These should all count against the same limit
    isLoginRateLimited("Test3-Normalize@Test.com"); // 1
    isLoginRateLimited(" test3-normalize@test.com "); // 2
    isLoginRateLimited("TEST3-NORMALIZE@test.com"); // 3
    expect(isLoginRateLimited(baseEmail)); // 4th attempt — still allowed
    expect(isLoginRateLimited(baseEmail)); // 5th attempt — still allowed (at max)
    expect(isLoginRateLimited(baseEmail)).toBe(true); // 6th attempt — blocked
  });

  it("tracks different users independently", () => {
    for (let i = 0; i < 5; i++) {
      isLoginRateLimited("test4-user1@test.com");
    }
    expect(isLoginRateLimited("test4-user1@test.com")).toBe(true);
    expect(isLoginRateLimited("test4-user2@test.com")).toBe(false);
  });

  it("resets after window expires", () => {
    for (let i = 0; i < 5; i++) {
      isLoginRateLimited("test5-reset@test.com");
    }
    expect(isLoginRateLimited("test5-reset@test.com")).toBe(true);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1000); // 15 min + 1 sec
    expect(isLoginRateLimited("test5-reset@test.com")).toBe(false);
  });
});
