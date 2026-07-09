import { describe, it, expect, beforeEach, vi } from "vitest";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    requireAuth: vi.fn(),
    requireCSRF: vi.fn().mockReturnValue({ verified: true }),
    userFindUnique: vi.fn(),
    verificationTokenDeleteMany: vi.fn(),
    verificationTokenDelete: vi.fn(),
    verificationTokenCreate: vi.fn(),
    sendEmail: vi.fn(),
    generateSecureToken: vi.fn().mockReturnValue("mock-verify-token"),
    rateLimitResult: { limited: false, remaining: 4, resetAt: Date.now() + 3600000 },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.userFindUnique },
    verificationToken: {
      deleteMany: mocks.verificationTokenDeleteMany,
      delete: mocks.verificationTokenDelete,
      create: mocks.verificationTokenCreate,
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  generateVerificationEmail: vi.fn().mockReturnValue({
    subject: "Verify your email",
    html: "<p>verify</p>",
  }),
}));

vi.mock("@/lib/crypto", () => ({
  generateSecureToken: mocks.generateSecureToken,
}));

vi.mock("@/lib/admin-guard", () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/csrf-middleware", () => ({
  requireCSRF: mocks.requireCSRF,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockImplementation(() => mocks.rateLimitResult),
  rateLimits: { resendVerification: { max: 3, windowMs: 3600000 } },
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
}));

import { POST } from "./route";

const authedSession = { session: { userId: "user-1", role: "STUDENT" } };

function makeRequest() {
  return new Request("http://localhost:3000/api/auth/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

describe("POST /api/auth/resend-verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue(authedSession);
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      emailVerified: null,
    });
    mocks.verificationTokenDeleteMany.mockResolvedValue({});
    mocks.verificationTokenCreate.mockResolvedValue({});
    mocks.sendEmail.mockResolvedValue(undefined);
    mocks.requireCSRF.mockReturnValue({ verified: true });
    mocks.rateLimitResult = { limited: false, remaining: 4, resetAt: Date.now() + 3600000 };
  });

  // =========================================================================
  // 1. Successful resend
  // =========================================================================

  describe("successful resend", () => {
    it("sends verification email and returns success", async () => {
      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("Email sent");
      expect(mocks.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "user@test.com" })
      );
    });

    it("creates verification token with email-verify identifier", async () => {
      await POST(makeRequest());

      expect(mocks.verificationTokenCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identifier: "email-verify:user-1",
          }),
        })
      );
    });

    it("deletes old verification tokens before creating new one", async () => {
      await POST(makeRequest());

      expect(mocks.verificationTokenDeleteMany).toHaveBeenCalledWith({
        where: { identifier: "email-verify:user-1" },
      });
    });
  });

  // =========================================================================
  // 2. Already verified
  // =========================================================================

  describe("already verified", () => {
    it("returns 400 when email is already verified", async () => {
      mocks.userFindUnique.mockResolvedValue({
        id: "user-1",
        email: "user@test.com",
        emailVerified: new Date(),
      });

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Email already verified");
    });

    it("does NOT send email when already verified", async () => {
      mocks.userFindUnique.mockResolvedValue({
        id: "user-1",
        email: "user@test.com",
        emailVerified: new Date(),
      });

      await POST(makeRequest());

      expect(mocks.sendEmail).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. User without email
  // =========================================================================

  describe("user without email", () => {
    it("returns 400 when user has no email", async () => {
      mocks.userFindUnique.mockResolvedValue({
        id: "user-1",
        email: null,
        emailVerified: null,
      });

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Email not provided");
    });
  });

  // =========================================================================
  // 4. Authentication
  // =========================================================================

  describe("authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mocks.requireAuth.mockResolvedValue({
        response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
      });

      const res = await POST(makeRequest());

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 5. CSRF
  // =========================================================================

  describe("CSRF protection", () => {
    it("returns 403 when CSRF verification fails", async () => {
      mocks.requireCSRF.mockReturnValue({
        response: new Response(JSON.stringify({ error: "CSRF token missing" }), { status: 403 }),
      });

      const res = await POST(makeRequest());

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 6. Rate limiting
  // =========================================================================

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 3600000 };

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(429);
    });
  });

  // =========================================================================
  // 7. Email send failure
  // =========================================================================

  describe("email send failure", () => {
    it("returns 503 and cleans up token when email fails", async () => {
      mocks.sendEmail.mockRejectedValue(new Error("SMTP down"));

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json.error).toContain("Failed to send email");
      expect(mocks.verificationTokenDeleteMany).toHaveBeenCalledWith({
        where: { identifier: "email-verify:user-1" },
      });
    });
  });

  // =========================================================================
  // 8. Server errors
  // =========================================================================

  describe("server errors", () => {
    it("returns 500 when database query fails", async () => {
      mocks.userFindUnique.mockRejectedValue(new Error("DB error"));

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});
