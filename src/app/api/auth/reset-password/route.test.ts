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
    $transaction: vi.fn().mockImplementation(async (callback) => {
      // For callback-based transactions, call the callback with a tx client
      const txClient = {
        verificationToken: {
          findUnique: mocks.mockVerificationTokenFindUnique,
          delete: mocks.mockVerificationTokenDelete,
        },
        user: {
          update: mocks.mockUserUpdate,
        },
      };
      return callback(txClient);
    }),
    bcryptHash: vi.fn().mockResolvedValue("$2a$12$hashednewpassword"),
    loggerError: vi.fn(),
    rateLimitResult: { limited: false, remaining: 4, resetAt: Date.now() + 3600000 },
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
    $transaction: mocks.$transaction,
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mocks.bcryptHash,
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
    rateLimits: {
      resetPassword: { max: 5, windowMs: 15 * 60 * 1000 },
    },
    createRateLimitResponse: vi.fn().mockImplementation((resetAt: number) => {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please try later" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        }
      );
    }),
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
  return new Request("http://localhost:3000/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validResetPayload = {
  token: "valid-reset-token",
  newPassword: "NewSecurePass123!",
};

const validVerificationToken = {
  token: "valid-reset-token",
  identifier: "password-reset:user-123",
  expires: new Date(Date.now() + 3600000), // 1 hour in the future
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimitResult = { limited: false, remaining: 4, resetAt: Date.now() + 3600000 };
    mocks.mockVerificationTokenFindUnique.mockResolvedValue(null);
    mocks.mockUserUpdate.mockResolvedValue({ id: "user-123" });
  });

  // =========================================================================
  // 1. Successful password reset
  // =========================================================================

  describe("successful password reset", () => {
    it("resets password with valid token and new password, returns 200", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(validVerificationToken);

      const req = makeRequest(validResetPayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("Password changed successfully");
      expect(mocks.bcryptHash).toHaveBeenCalledWith("NewSecurePass123!", 12);
      expect(mocks.mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-123" },
          data: expect.objectContaining({
            hashedPassword: "$2a$12$hashednewpassword",
          }),
        })
      );
      expect(mocks.mockVerificationTokenDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: "valid-reset-token" },
        })
      );
    });

    it("extracts userId from identifier format password-reset:userId", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue({
        ...validVerificationToken,
        identifier: "password-reset:user-456",
      });

      const req = makeRequest(validResetPayload);
      await POST(req);

      expect(mocks.mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-456" },
        })
      );
    });

    it("deletes the used token after successful reset", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(validVerificationToken);

      const req = makeRequest(validResetPayload);
      await POST(req);

      expect(mocks.mockVerificationTokenDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: "valid-reset-token" },
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

      const req = makeRequest(validResetPayload);
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

      const req = makeRequest(validResetPayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверный токен или срок его действия истёк");
    });

    it("does NOT update password when token is invalid", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(null);

      const req = makeRequest(validResetPayload);
      await POST(req);

      expect(mocks.mockUserUpdate).not.toHaveBeenCalled();
    });

    it("does NOT hash password when token is invalid", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(null);

      const req = makeRequest(validResetPayload);
      await POST(req);

      expect(mocks.bcryptHash).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. Missing fields
  // =========================================================================

  describe("missing fields", () => {
    it("rejects missing token with 400", async () => {
      const { token: _token, ...payload } = validResetPayload;
      const req = makeRequest(payload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid data");
    });

    it("rejects empty token with 400", async () => {
      const req = makeRequest({ ...validResetPayload, token: "" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid data");
    });

    it("rejects missing newPassword with 400", async () => {
      const { newPassword: _newPassword, ...payload } = validResetPayload;
      const req = makeRequest(payload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid data");
    });

    it("rejects empty newPassword with 400", async () => {
      const req = makeRequest({ ...validResetPayload, newPassword: "" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid data");
    });
  });

  // =========================================================================
  // 4. Password too short
  // =========================================================================

  describe("password too short", () => {
    it("rejects newPassword shorter than 8 characters with 400", async () => {
      const req = makeRequest({ ...validResetPayload, newPassword: "short" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid data");
    });

    it("rejects newPassword of exactly 7 characters with 400", async () => {
      const req = makeRequest({ ...validResetPayload, newPassword: "1234567" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid data");
    });

    it("accepts newPassword of exactly 8 characters", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(validVerificationToken);

      const req = makeRequest({ ...validResetPayload, newPassword: "12345678" });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });
  });

  // =========================================================================
  // 5. Password too long
  // =========================================================================

  describe("password too long", () => {
    it("rejects newPassword longer than 128 characters with 400", async () => {
      const req = makeRequest({ ...validResetPayload, newPassword: "a".repeat(129) });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid data");
    });
  });

  // =========================================================================
  // 6. Rate limiting
  // =========================================================================

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 3600000 };

      const req = makeRequest(validResetPayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(429);
      expect(json.error).toBe("Too many attempts. Please try later");
    });

    it("includes Retry-After header in rate limit response", async () => {
      const futureReset = Date.now() + 60000;
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: futureReset };

      const req = makeRequest(validResetPayload);
      const res = await POST(req);

      const retryAfter = res.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it("does NOT query database when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 3600000 };

      const req = makeRequest(validResetPayload);
      await POST(req);

      expect(mocks.mockVerificationTokenFindUnique).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. Server error handling
  // =========================================================================

  describe("server error handling", () => {
    it("returns 500 when database query fails", async () => {
      mocks.mockVerificationTokenFindUnique.mockRejectedValueOnce(new Error("DB connection error"));

      const req = makeRequest(validResetPayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });

    it("returns 500 when user update fails", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(validVerificationToken);
      mocks.$transaction.mockRejectedValueOnce(new Error("Update failed"));

      const req = makeRequest(validResetPayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});
