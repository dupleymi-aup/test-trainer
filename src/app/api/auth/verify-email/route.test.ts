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
    mockUserFindUnique: vi.fn(),
    loggerError: vi.fn(),
    rateLimitResult: { limited: false, remaining: 4, resetAt: Date.now() + 900000 },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    verificationToken: {
      findUnique: mocks.mockVerificationTokenFindUnique,
      delete: mocks.mockVerificationTokenDelete,
    },
    user: {
      findUnique: mocks.mockUserFindUnique,
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
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
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
        JSON.stringify({ error: "Too many requests" }),
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
      verifyEmail: { max: 5, windowMs: 900000 },
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
    mocks.mockUserFindUnique.mockResolvedValue(null);
    mocks.mockUserUpdate.mockResolvedValue({ id: "user-123" });
  });

  // =========================================================================
  // 1. Successful email verification
  // =========================================================================

  describe("successful email verification", () => {
    it("verifies email with valid token, returns 200", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(validVerificationToken);
      mocks.mockUserFindUnique.mockResolvedValue({ id: "user-123", emailVerified: null });

      const req = makeRequest({ token: "valid-verify-token" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
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
      mocks.mockUserFindUnique.mockResolvedValue({ id: "user-456", emailVerified: null });

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
      mocks.mockUserFindUnique.mockResolvedValue({ id: "user-123", emailVerified: null });

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
      expect(json.error).toBe("Invalid or expired token");
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
      expect(json.error).toBe("Invalid or expired token");
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
      expect(typeof json.error).toBe("string");
      expect(json.error.length).toBeGreaterThan(0);
    });

    it("rejects empty token with 400", async () => {
      const req = makeRequest({ token: "" });
      const res = await POST(req);
      const _json = await res.json();

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 4. Wrong token type
  // =========================================================================

  describe("wrong token type", () => {
    it("returns 400 when token is not an email-verify token", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue({
        ...validVerificationToken,
        identifier: "password-reset:user-123",
      });

      const req = makeRequest({ token: "password-reset-token" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid or expired token");
    });
  });

  // =========================================================================
  // 5. Invalid token format
  // =========================================================================

  describe("invalid token format", () => {
    it("returns 400 when identifier has no userId", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue({
        ...validVerificationToken,
        identifier: "email-verify:",
      });

      const req = makeRequest({ token: "malformed-token" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid token format");
    });
  });

  // =========================================================================
  // 6. User not found
  // =========================================================================

  describe("user not found", () => {
    it("returns 404 when user does not exist", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(validVerificationToken);
      mocks.mockUserFindUnique.mockResolvedValue(null);

      const req = makeRequest({ token: "valid-verify-token" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe("User not found");
    });
  });

  // =========================================================================
  // 7. Already verified
  // =========================================================================

  describe("already verified", () => {
    it("returns 400 when email is already verified", async () => {
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(validVerificationToken);
      mocks.mockUserFindUnique.mockResolvedValue({ id: "user-123", emailVerified: new Date() });

      const req = makeRequest({ token: "valid-verify-token" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Email already verified");
    });
  });

  // =========================================================================
  // 8. Rate limiting
  // =========================================================================

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 900000 };

      const req = makeRequest({ token: "valid-verify-token" });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });

    it("does NOT query database when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 900000 };

      const req = makeRequest({ token: "valid-verify-token" });
      await POST(req);

      expect(mocks.mockVerificationTokenFindUnique).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 9. Server error handling
  // =========================================================================

  describe("server error handling", () => {
    it("returns 500 when database query fails", async () => {
      mocks.rateLimitResult = { limited: false, remaining: 4, resetAt: Date.now() + 900000 };
      mocks.mockVerificationTokenFindUnique.mockRejectedValueOnce(new Error("DB connection error"));

      const req = makeRequest({ token: "valid-verify-token" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });

    it("returns 500 when user update fails", async () => {
      mocks.rateLimitResult = { limited: false, remaining: 4, resetAt: Date.now() + 900000 };
      mocks.mockVerificationTokenFindUnique.mockResolvedValue(validVerificationToken);
      mocks.mockUserFindUnique.mockResolvedValue({ id: "user-123", emailVerified: null });
      mocks.mockUserUpdate.mockRejectedValueOnce(new Error("Update failed"));

      const req = makeRequest({ token: "valid-verify-token" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});
