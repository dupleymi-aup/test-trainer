import { describe, it, expect, beforeEach, vi } from "vitest";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    verificationCodeFindFirst: vi.fn(),
    verificationCodeDelete: vi.fn(),
    userFindUnique: vi.fn(),
    verificationTokenCreate: vi.fn(),
    $transaction: vi.fn().mockImplementation(async (operations: unknown[]) => {
      return Promise.all(operations);
    }),
    generateSecureToken: vi.fn().mockReturnValue("mock-reset-token"),
    rateLimitResult: { limited: false, remaining: 9, resetAt: Date.now() + 900000 },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    verificationCode: {
      findFirst: mocks.verificationCodeFindFirst,
      delete: mocks.verificationCodeDelete,
    },
    user: { findUnique: mocks.userFindUnique },
    verificationToken: { create: mocks.verificationTokenCreate },
    $transaction: mocks.$transaction,
  },
}));

vi.mock("@/lib/crypto", () => ({
  generateSecureToken: mocks.generateSecureToken,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockImplementation(() => mocks.rateLimitResult),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  rateLimits: { verifyOtp: { max: 5, windowMs: 900000 } },
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
}));

import { POST } from "./route";

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validCode = {
  id: "code-1",
  phone: "+1234567890",
  code: "123456",
  expires: new Date(Date.now() + 900000),
};

describe("POST /api/auth/verify-otp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verificationCodeFindFirst.mockResolvedValue(null);
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.verificationCodeDelete.mockResolvedValue({});
    mocks.verificationTokenCreate.mockResolvedValue({});
    mocks.rateLimitResult = { limited: false, remaining: 9, resetAt: Date.now() + 900000 };
  });

  // =========================================================================
  // 1. Successful OTP verification
  // =========================================================================

  describe("successful verification", () => {
    it("verifies valid OTP and returns success", async () => {
      mocks.verificationCodeFindFirst.mockResolvedValue(validCode);
      mocks.userFindUnique.mockResolvedValue({ id: "user-1", phone: "+1234567890" });

      const res = await POST(makeRequest({ phone: "+1234567890", code: "123456" }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("Code verified");
    });

    it("sets reset_token cookie in response", async () => {
      mocks.verificationCodeFindFirst.mockResolvedValue(validCode);
      mocks.userFindUnique.mockResolvedValue({ id: "user-1", phone: "+1234567890" });

      const res = await POST(makeRequest({ phone: "+1234567890", code: "123456" }));

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("reset_token");
      expect(setCookie).toContain("HttpOnly");
    });

    it("creates password-reset token in transaction", async () => {
      mocks.verificationCodeFindFirst.mockResolvedValue(validCode);
      mocks.userFindUnique.mockResolvedValue({ id: "user-1", phone: "+1234567890" });

      await POST(makeRequest({ phone: "+1234567890", code: "123456" }));

      expect(mocks.verificationTokenCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identifier: "password-reset:user-1",
          }),
        })
      );
    });

    it("deletes the used verification code", async () => {
      mocks.verificationCodeFindFirst.mockResolvedValue(validCode);
      mocks.userFindUnique.mockResolvedValue({ id: "user-1", phone: "+1234567890" });

      await POST(makeRequest({ phone: "+1234567890", code: "123456" }));

      expect(mocks.verificationCodeDelete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "code-1" } })
      );
    });
  });

  // =========================================================================
  // 2. Invalid/expired OTP
  // =========================================================================

  describe("invalid OTP", () => {
    it("returns 400 when code is not found", async () => {
      mocks.verificationCodeFindFirst.mockResolvedValue(null);

      const res = await POST(makeRequest({ phone: "+1234567890", code: "000000" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid or expired code");
    });

    it("does NOT create reset token when code is invalid", async () => {
      mocks.verificationCodeFindFirst.mockResolvedValue(null);

      await POST(makeRequest({ phone: "+1234567890", code: "000000" }));

      expect(mocks.verificationTokenCreate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. User not found after OTP verification
  // =========================================================================

  describe("user not found", () => {
    it("returns 404 when user does not exist after valid OTP", async () => {
      mocks.verificationCodeFindFirst.mockResolvedValue(validCode);
      mocks.userFindUnique.mockResolvedValue(null);

      const res = await POST(makeRequest({ phone: "+1234567890", code: "123456" }));
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe("User not found");
    });
  });

  // =========================================================================
  // 4. Validation
  // =========================================================================

  describe("validation", () => {
    it("rejects missing phone", async () => {
      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(400);
    });

    it("rejects missing code", async () => {
      const res = await POST(makeRequest({ phone: "+1234567890" }));
      expect(res.status).toBe(400);
    });

    it("rejects empty phone", async () => {
      const res = await POST(makeRequest({ phone: "", code: "123456" }));
      expect(res.status).toBe(400);
    });

    it("rejects empty code", async () => {
      const res = await POST(makeRequest({ phone: "+1234567890", code: "" }));
      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 5. Rate limiting
  // =========================================================================

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 900000 };

      const res = await POST(makeRequest({ phone: "+1234567890", code: "123456" }));

      expect(res.status).toBe(429);
    });

    it("does NOT query database when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 900000 };

      await POST(makeRequest({ phone: "+1234567890", code: "123456" }));

      expect(mocks.verificationCodeFindFirst).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 6. Server errors
  // =========================================================================

  describe("server errors", () => {
    it("returns 500 when database query fails", async () => {
      mocks.verificationCodeFindFirst.mockRejectedValue(new Error("DB error"));

      const res = await POST(makeRequest({ phone: "+1234567890", code: "123456" }));
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});
