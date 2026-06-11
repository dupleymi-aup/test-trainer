import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock modules BEFORE importing the route handler
// vi.mock is hoisted, so we use vi.hoisted to define the mock variables
// ---------------------------------------------------------------------------

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockVerificationTokenFindUnique: vi.fn(),
    mockVerificationTokenDelete: vi.fn(),
    mockUserUpdate: vi.fn(),
    loggerError: vi.fn(),
    rateLimitResult: { limited: false, remaining: 99, resetAt: Date.now() + 3600000 },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    verificationToken: {
      findUnique: mocks.mockVerificationTokenFindUnique,
      delete: mocks.mockVerificationTokenDelete,
    },
    user: {
      update: mocks.mockUserUpdate,
    },
    $transaction: vi.fn().mockImplementation(async (operations: unknown[]) => {
      // Execute each mock operation sequentially
      return Promise.all(operations);
    }),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: mocks.loggerError,
  },
}));

vi.mock("@/lib/rate-limit", () => {
  const m = mocks;
  return {
    checkRateLimit: vi.fn().mockImplementation(() => m.rateLimitResult),
    getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
    createRateLimitResponse: vi.fn().mockImplementation((resetAt: number) => {
      const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
      return new Response(
        JSON.stringify({ error: "Слишком много попыток. Попробуйте позже" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        }
      );
    }),
    rateLimits: {
      verifyEmail: { max: 5, windowMs: 15 * 60 * 1000 },
    },
  };
});

// ---------------------------------------------------------------------------
// Import route handler AFTER mocks are set up
// ---------------------------------------------------------------------------

import { POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>, headers?: Record<string, string>) {
  return new Request("http://localhost:3000/api/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validVerificationToken = {
  token: "valid-verify-token",
  identifier: "email-verify:user-123",
  expires: new Date(Date.now() + 3600000), // 1 hour in the future
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/verify-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockVerificationTokenFindUnique.mockResolvedValue(null);
    mocks.mockUserUpdate.mockResolvedValue({ id: "user-123" });
  });

  // =========================================================================
  // 1. Successful email verification
  // =========================================================================

  describe("successful email verification", () => {
    it("verifies email with valid token, returns 200", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(validVerificationToken);

      const req = makeRequest({ token: "valid-verify-token" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("Email подтверждён");
      expect(mocks.mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-123" },
          data: expect.objectContaining({
            emailVerified: expect.any(Date),
          }),
        })
      );
    });

    it("extracts userId from identifier format email-verify:userId", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue({
        ...validVerificationToken,
        identifier: "email-verify:user-456",
      });

      const req = makeRequest({ token: "valid-verify-token" });
      await POST(req);

      expect(mocks.mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-456" },
        })
      );
    });

    it("deletes the used token after successful verification", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(validVerificationToken);

      const req = makeRequest({ token: "valid-verify-token" });
      await POST(req);

      expect(mocks.mockVerificationTokenDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: "valid-verify-token" },
        })
      );
    });
  });

  // =========================================================================
  // 2. Invalid/expired token
  // =========================================================================

  describe("invalid/expired token", () => {
    it("returns 400 when token does not exist", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(null);

      const req = makeRequest({ token: "nonexistent-token" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверный токен или срок его действия истёк");
    });

    it("returns 400 when token is expired", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue({
        ...validVerificationToken,
        expires: new Date(Date.now() - 3600000), // 1 hour in the past
      });

      const req = makeRequest({ token: "expired-token" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверный токен или срок его действия истёк");
    });

    it("does NOT update user when token is invalid", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(null);

      const req = makeRequest({ token: "nonexistent-token" });
      await POST(req);

      expect(mocks.mockUserUpdate).not.toHaveBeenCalled();
    });

    it("does NOT delete token when token is invalid", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(null);

      const req = makeRequest({ token: "nonexistent-token" });
      await POST(req);

      expect(mocks.mockVerificationTokenDelete).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. Missing token
  // =========================================================================

  describe("missing token", () => {
    it("rejects missing token with 400", async () => {
      const req = makeRequest({});
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Отсутствует токен");
    });

    it("rejects empty token with 400", async () => {
      const req = makeRequest({ token: "" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Отсутствует токен");
    });
  });

  // =========================================================================
  // 4. Server error handling
  // =========================================================================

  describe("server error handling", () => {
    it("returns 500 when database query fails", async () => {
      mocks.mockVerificationTokenFindUnique.mockRejectedValueOnce(new Error("DB connection error"));

      const req = makeRequest({ token: "valid-verify-token" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Ошибка при подтверждении email");
    });

    it("returns 500 when user update fails", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(validVerificationToken);
      mocks.mockUserUpdate.mockRejectedValueOnce(new Error("Update failed"));

      const req = makeRequest({ token: "valid-verify-token" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Ошибка при подтверждении email");
    });
  });
});
