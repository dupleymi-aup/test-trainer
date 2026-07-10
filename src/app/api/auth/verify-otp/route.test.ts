import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  codeFindFirst: vi.fn(),
  codeDelete: vi.fn(),
  tokenCreate: vi.fn(),
  userFindUnique: vi.fn(),
  rateLimitResult: { limited: false, remaining: 4, resetAt: Date.now() + 900000 },
}));

vi.mock("@/lib/db", () => ({
  db: {
    verificationCode: {
      findFirst: mocks.codeFindFirst,
      delete: mocks.codeDelete,
    },
    verificationToken: {
      create: mocks.tokenCreate,
    },
    user: {
      findUnique: mocks.userFindUnique,
    },
    $transaction: vi.fn(async (txns: any[]) => {
      const results: any[] = [];
      for (const txn of txns) results.push(await txn);
      return results;
    }),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockImplementation(() => mocks.rateLimitResult),
  rateLimits: { verifyOtp: { max: 5, windowMs: 900000 } },
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { POST } from "./route";

const validCode = {
  id: "code-1",
  code: "123456",
  phone: "+79991234567",
  expires: new Date(Date.now() + 300000),
  createdAt: new Date(),
};

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/verify-otp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.codeFindFirst.mockResolvedValue(validCode);
    mocks.codeDelete.mockResolvedValue({});
    mocks.tokenCreate.mockResolvedValue({});
    mocks.userFindUnique.mockResolvedValue({ id: "user-1", phone: "+79991234567" });
    mocks.rateLimitResult = { limited: false, remaining: 4, resetAt: Date.now() + 900000 };
  });

  describe("success", () => {
    it("verifies correct OTP code", async () => {
      const res = await POST(makeRequest({ phone: "+79991234567", code: "123456" }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("Code verified");
    });

    it("looks up code by phone and code", async () => {
      await POST(makeRequest({ phone: "+79991234567", code: "123456" }));

      expect(mocks.codeFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            phone: "+79991234567",
            code: "123456",
            expires: expect.objectContaining({ gt: expect.any(Date) }),
          }),
        })
      );
    });

    it("creates password-reset token after verification", async () => {
      await POST(makeRequest({ phone: "+79991234567", code: "123456" }));

      expect(mocks.tokenCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identifier: "password-reset:user-1",
            expires: expect.any(Date),
          }),
        })
      );
    });

    it("deletes the used verification code", async () => {
      await POST(makeRequest({ phone: "+79991234567", code: "123456" }));

      expect(mocks.codeDelete).toHaveBeenCalledWith({ where: { id: "code-1" } });
    });

    it("sets reset_token cookie in response", async () => {
      const res = await POST(makeRequest({ phone: "+79991234567", code: "123456" }));

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("reset_token");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("Path=/api/auth/reset-password");
    });
  });

  describe("validation", () => {
    it("rejects missing phone", async () => {
      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(400);
    });

    it("rejects missing code", async () => {
      const res = await POST(makeRequest({ phone: "+79991234567" }));
      expect(res.status).toBe(400);
    });
  });

  describe("invalid code", () => {
    it("returns 400 for invalid code", async () => {
      mocks.codeFindFirst.mockResolvedValue(null);

      const res = await POST(makeRequest({ phone: "+79991234567", code: "000000" }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid or expired code");
    });

    it("returns 400 for expired code", async () => {
      mocks.codeFindFirst.mockResolvedValue(null);

      const res = await POST(makeRequest({ phone: "+79991234567", code: "123456" }));
      expect(res.status).toBe(400);
    });
  });

  describe("user not found", () => {
    it("returns 404 when user does not exist", async () => {
      mocks.userFindUnique.mockResolvedValue(null);

      const res = await POST(makeRequest({ phone: "+79991234567", code: "123456" }));
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe("User not found");
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 900000 };

      const res = await POST(makeRequest({ phone: "+79991234567", code: "123456" }));
      expect(res.status).toBe(429);
    });
  });

  describe("server errors", () => {
    it("returns 500 on database error", async () => {
      mocks.codeFindFirst.mockRejectedValue(new Error("DB error"));

      const res = await POST(makeRequest({ phone: "+79991234567", code: "123456" }));
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});
