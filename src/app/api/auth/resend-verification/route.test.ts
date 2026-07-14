import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCSRF: vi.fn().mockReturnValue({ verified: true }),
  userFindUnique: vi.fn(),
  tokenDeleteMany: vi.fn(),
  tokenCreate: vi.fn(),
  tokenDelete: vi.fn(),
  sendEmail: vi.fn().mockResolvedValue(true),
  generateVerificationEmail: vi.fn().mockReturnValue({
    subject: "Verify your email",
    html: "<p>Click link</p>",
    text: "Click link to verify",
  }),
  rateLimitResult: { limited: false, remaining: 1, resetAt: Date.now() + 3600000 },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
    },
    verificationToken: {
      deleteMany: mocks.tokenDeleteMany,
      create: mocks.tokenCreate,
      delete: mocks.tokenDelete,
    },
  },
}));

vi.mock("@/lib/admin-guard", () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/csrf-middleware", () => ({
  requireCSRF: mocks.requireCSRF,
}));

vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  generateVerificationEmail: mocks.generateVerificationEmail,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockImplementation(() => mocks.rateLimitResult),
  rateLimits: { resendVerification: { max: 2, windowMs: 3600000 } },
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
}));

import { POST } from "./route";

const authedSession = { session: { userId: "user-1", role: "STUDENT" } };
const userWithEmail = {
  id: "user-1",
  email: "alice@test.com",
  emailVerified: null,
};

const userVerified = {
  id: "user-1",
  email: "alice@test.com",
  emailVerified: new Date("2026-01-01"),
};

function makeRequest() {
  return new Request("http://localhost:3000/api/auth/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/auth/resend-verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue(authedSession);
    mocks.requireCSRF.mockReturnValue({ verified: true });
    mocks.userFindUnique.mockResolvedValue(userWithEmail);
    mocks.tokenDeleteMany.mockResolvedValue({ count: 1 });
    mocks.tokenCreate.mockResolvedValue({ token: "new-token" });
    mocks.rateLimitResult = { limited: false, remaining: 1, resetAt: Date.now() + 3600000 };
  });

  describe("success", () => {
    it("resends verification email", async () => {
      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it("generates a new verification token", async () => {
      await POST(makeRequest());

      expect(mocks.tokenDeleteMany).toHaveBeenCalledWith({
        where: { identifier: "email-verify:user-1" },
      });
      expect(mocks.tokenCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identifier: "email-verify:user-1",
            expires: expect.any(Date),
          }),
        })
      );
    });

    it("sends email with verification link", async () => {
      await POST(makeRequest());

      expect(mocks.sendEmail).toHaveBeenCalledWith({
        to: "alice@test.com",
        subject: "Verify your email",
        html: "<p>Click link</p>",
        text: "Click link to verify",
      });
    });
  });

  describe("authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mocks.requireAuth.mockResolvedValue({
        response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
      });

      const res = await POST(makeRequest());
      expect(res.status).toBe(401);
    });
  });

  describe("CSRF protection", () => {
    it("returns 403 when CSRF fails", async () => {
      mocks.requireCSRF.mockReturnValue({
        response: new Response(JSON.stringify({ error: "CSRF token missing" }), { status: 403 }),
      });

      const res = await POST(makeRequest());
      expect(res.status).toBe(403);
    });
  });

  describe("user checks", () => {
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

    it("returns 400 when email is already verified", async () => {
      mocks.userFindUnique.mockResolvedValue(userVerified);

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Email already verified");
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 3600000 };

      const res = await POST(makeRequest());
      expect(res.status).toBe(429);
    });
  });

  describe("email failure", () => {
    it("returns 503 and deletes token when email fails", async () => {
      mocks.sendEmail.mockRejectedValue(new Error("SMTP error"));

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json.error).toContain("Failed to send email");
      expect(mocks.tokenDelete).toHaveBeenCalled();
    });
  });

  describe("server errors", () => {
    it("returns 500 on database error", async () => {
      mocks.userFindUnique.mockRejectedValue(new Error("DB error"));

      const res = await POST(makeRequest());
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});
