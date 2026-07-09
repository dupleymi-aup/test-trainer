import { describe, it, expect, beforeEach, vi } from "vitest";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    userFindUnique: vi.fn(),
    verificationTokenCreate: vi.fn(),
    verificationTokenDeleteMany: vi.fn(),
    verificationCodeCreate: vi.fn(),
    verificationCodeDeleteMany: vi.fn(),
    sendEmail: vi.fn(),
    sendSMS: vi.fn(),
    generateSecureToken: vi.fn().mockReturnValue("mock-reset-token"),
    generateSecureOTP: vi.fn().mockReturnValue("123456"),
    rateLimitResult: { limited: false, remaining: 9, resetAt: Date.now() + 900000 },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.userFindUnique },
    verificationToken: {
      create: mocks.verificationTokenCreate,
      deleteMany: mocks.verificationTokenDeleteMany,
    },
    verificationCode: {
      create: mocks.verificationCodeCreate,
      deleteMany: mocks.verificationCodeDeleteMany,
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  generatePasswordResetEmail: vi.fn().mockReturnValue({
    subject: "Reset your password",
    html: "<p>reset</p>",
  }),
}));

vi.mock("@/lib/sms", () => ({
  sendSMS: mocks.sendSMS,
}));

vi.mock("@/lib/crypto", () => ({
  generateSecureToken: mocks.generateSecureToken,
  generateSecureOTP: mocks.generateSecureOTP,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockImplementation(() => mocks.rateLimitResult),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  rateLimits: { forgotPassword: { windowMs: 900000, max: 5 } },
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from "./route";

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.verificationTokenCreate.mockResolvedValue({});
    mocks.verificationCodeCreate.mockResolvedValue({});
    mocks.sendEmail.mockResolvedValue(undefined);
    mocks.sendSMS.mockResolvedValue({ success: true });
    mocks.rateLimitResult = { limited: false, remaining: 9, resetAt: Date.now() + 900000 };
  });

  // =========================================================================
  // 1. Email flow — existing user
  // =========================================================================

  describe("email flow — existing user", () => {
    it("sends reset email and returns success message", async () => {
      mocks.userFindUnique.mockResolvedValue({ id: "user-1", email: "user@test.com" });

      const res = await POST(makeRequest({ email: "user@test.com" }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toContain("instructions sent to email");
      expect(json.method).toBe("email");
      expect(mocks.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "user@test.com" })
      );
    });

    it("creates verification token with password-reset identifier", async () => {
      mocks.userFindUnique.mockResolvedValue({ id: "user-1", email: "user@test.com" });

      await POST(makeRequest({ email: "user@test.com" }));

      expect(mocks.verificationTokenCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identifier: "password-reset:user-1",
          }),
        })
      );
    });

    it("normalizes email to lowercase", async () => {
      mocks.userFindUnique.mockResolvedValue({ id: "user-1", email: "user@test.com" });

      await POST(makeRequest({ email: "User@Test.COM" }));

      expect(mocks.userFindUnique).toHaveBeenCalledWith({
        where: { email: "user@test.com" },
      });
    });
  });

  // =========================================================================
  // 2. Email flow — non-existent user (anti-enumeration)
  // =========================================================================

  describe("email flow — non-existent user", () => {
    it("still creates a dummy token to prevent timing attacks", async () => {
      mocks.userFindUnique.mockResolvedValue(null);

      const res = await POST(makeRequest({ email: "unknown@test.com" }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toContain("instructions sent to email");
      expect(mocks.verificationTokenCreate).toHaveBeenCalled();
    });

    it("does NOT send email for non-existent user", async () => {
      mocks.userFindUnique.mockResolvedValue(null);

      await POST(makeRequest({ email: "unknown@test.com" }));

      expect(mocks.sendEmail).not.toHaveBeenCalled();
    });

    it("dummy token identifier starts with password-reset:dummy", async () => {
      mocks.userFindUnique.mockResolvedValue(null);

      await POST(makeRequest({ email: "unknown@test.com" }));

      const call = mocks.verificationTokenCreate.mock.calls[0][0];
      expect(call.data.identifier).toMatch(/^password-reset:dummy-/);
    });
  });

  // =========================================================================
  // 3. Phone flow — existing user
  // =========================================================================

  describe("phone flow — existing user", () => {
    it("sends SMS with OTP code", async () => {
      mocks.userFindUnique.mockResolvedValue({ id: "user-1", phone: "+1234567890" });

      const res = await POST(makeRequest({ phone: "+1234567890" }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toContain("code sent via SMS");
      expect(json.method).toBe("phone");
      expect(mocks.sendSMS).toHaveBeenCalledWith(
        expect.objectContaining({ phone: "+1234567890" })
      );
    });

    it("creates verification code with phone identifier", async () => {
      mocks.userFindUnique.mockResolvedValue({ id: "user-1", phone: "+1234567890" });

      await POST(makeRequest({ phone: "+1234567890" }));

      expect(mocks.verificationCodeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: "+1234567890",
            code: "123456",
          }),
        })
      );
    });
  });

  // =========================================================================
  // 4. Phone flow — non-existent user (anti-enumeration)
  // =========================================================================

  describe("phone flow — non-existent user", () => {
    it("still creates a dummy code to prevent timing attacks", async () => {
      mocks.userFindUnique.mockResolvedValue(null);

      const res = await POST(makeRequest({ phone: "+9999999999" }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toContain("code sent via SMS");
      expect(mocks.verificationCodeCreate).toHaveBeenCalled();
    });

    it("does NOT send SMS for non-existent user", async () => {
      mocks.userFindUnique.mockResolvedValue(null);

      await POST(makeRequest({ phone: "+9999999999" }));

      expect(mocks.sendSMS).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. Validation
  // =========================================================================

  describe("validation", () => {
    it("rejects request with neither email nor phone", async () => {
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
    });

    it("rejects invalid email format", async () => {
      const res = await POST(makeRequest({ email: "not-an-email" }));
      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 6. Email send failure
  // =========================================================================

  describe("email send failure", () => {
    it("returns 503 when email sending fails and cleans up token", async () => {
      mocks.userFindUnique.mockResolvedValue({ id: "user-1", email: "user@test.com" });
      mocks.sendEmail.mockRejectedValue(new Error("SMTP down"));

      const res = await POST(makeRequest({ email: "user@test.com" }));
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json.error).toContain("Failed to send email");
      expect(mocks.verificationTokenDeleteMany).toHaveBeenCalled();
    });

    it("returns 503 when SMS sending fails and cleans up code", async () => {
      mocks.userFindUnique.mockResolvedValue({ id: "user-1", phone: "+1234567890" });
      mocks.sendSMS.mockResolvedValue({ success: false, error: "SMS provider down" });

      const res = await POST(makeRequest({ phone: "+1234567890" }));
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json.error).toContain("Failed to send SMS");
      expect(mocks.verificationCodeDeleteMany).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. Rate limiting
  // =========================================================================

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 900000 };

      const res = await POST(makeRequest({ email: "user@test.com" }));
      const json = await res.json();

      expect(res.status).toBe(429);
    });

    it("does NOT query database when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 900000 };

      await POST(makeRequest({ email: "user@test.com" }));

      expect(mocks.userFindUnique).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 8. Server errors
  // =========================================================================

  describe("server errors", () => {
    it("returns 500 when database query fails", async () => {
      mocks.userFindUnique.mockRejectedValue(new Error("DB connection error"));

      const res = await POST(makeRequest({ email: "user@test.com" }));
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});
