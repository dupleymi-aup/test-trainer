import { test, expect } from "@playwright/test";

test.describe("Security", () => {
  test("forgot password does not leak reset token", async ({ page }) => {
    const response = await page.request.post("/api/auth/forgot-password", {
      data: { email: "test@test.com" },
    });
    const body = await response.json();
    // Token must NOT be in the response
    expect(body).not.toHaveProperty("token");
  });

  test("forgot password does not leak phone number", async ({ page }) => {
    const response = await page.request.post("/api/auth/forgot-password", {
      data: { phone: "+79001234567" },
    });
    const body = await response.json();
    expect(body).not.toHaveProperty("phone");
  });

  test("rate limiting returns 429 after too many attempts", async ({ page }) => {
    // Login brute-force protection: 5 attempts per 15 min
    const attempts = [];
    for (let i = 0; i < 7; i++) {
      const res = await page.request.post("/api/auth/login", {
        data: { login: "test@test.com", password: "wrongpassword" },
        headers: { "Content-Type": "application/json" },
      });
      attempts.push(res.status());
    }
    // Last attempts should be rate limited
    expect(attempts).toContain(429);
  });

  test("CSRF token is required for state-changing API calls", async ({ page }) => {
    // Try to create a group without CSRF token (should fail with 403)
    const response = await page.request.post("/api/teacher/groups", {
      data: { name: "Hacker Group", description: "Testing" },
      headers: { "Content-Type": "application/json" },
    });
    // Should be 401 (no auth) or 403 (CSRF) - either way, not 200
    expect([401, 403]).toContain(response.status());
  });
});
