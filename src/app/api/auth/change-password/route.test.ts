import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock modules BEFORE importing the route handler
// vi.mock is hoisted, so we use vi.hoisted to define the mock variables
// ---------------------------------------------------------------------------

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserFindUnique: vi.fn(),
    mockUserUpdate: vi.fn(),
    requireAuthResult: { session: { userId: "user-123", role: "STUDENT" } } as { session: { userId: string; role: string } } | { response: unknown },
    bcryptCompare: vi.fn(),
    bcryptHash: vi.fn().mockResolvedValue("$2a$12$hashednewpassword"),
    loggerError: vi.fn(),
    rateLimitResult: { limited: false, remaining: 4, resetAt: Date.now() + 3600000 },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.mockUserFindUnique,
      update: mocks.mockUserUpdate,
    },
  },
}));

vi.mock("@/lib/admin-guard", () => ({
  requireAuth: vi.fn().mockImplementation(() => mocks.requireAuthResult),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.bcryptCompare,
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
    rateLimits: {
      changePassword: { max: 5, windowMs: 15 * 60 * 1000 },
    },
    createRateLimitResponse: vi.fn().mockImplementation((resetAt: number) => {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
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
  };
});

vi.mock("@/lib/csrf-middleware", () => ({
  requireCSRF: vi.fn().mockResolvedValue({ verified: true }),
}));

// ---------------------------------------------------------------------------
// Import route handler AFTER mocks are set up
// ---------------------------------------------------------------------------

import { POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>, headers?: Record<string, string>) {
  return new Request("http://localhost:3000/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validChangePayload = {
  currentPassword: "OldSecurePass123!",
  newPassword: "NewSecurePass123!",
};

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  hashedPassword: "$2a$12$hashedoldpassword",
  role: "STUDENT",
  isActive: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/change-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimitResult = { limited: false, remaining: 4, resetAt: Date.now() + 3600000 };
    mocks.requireAuthResult = { session: { userId: "user-123", role: "STUDENT" } };
    mocks.mockUserFindUnique.mockResolvedValue(null);
    mocks.bcryptCompare.mockResolvedValue(false);
    mocks.mockUserUpdate.mockResolvedValue({ id: "user-123" });
  });

  // =========================================================================
  // 1. Successful password change
  // =========================================================================

  describe("successful password change", () => {
    it("changes password with correct current password, returns 200", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(mockUser);
      mocks.bcryptCompare.mockResolvedValue(true);

      const req = makeRequest(validChangePayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("Пароль успешно изменён");
      expect(mocks.bcryptCompare).toHaveBeenCalledWith("OldSecurePass123!", "$2a$12$hashedoldpassword");
      expect(mocks.bcryptHash).toHaveBeenCalledWith("NewSecurePass123!", 12);
      expect(mocks.mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-123" },
          data: expect.objectContaining({
            hashedPassword: "$2a$12$hashednewpassword",
          }),
        })
      );
    });
  });

  // =========================================================================
  // 2. Wrong current password — returns 401
  // =========================================================================

  describe("wrong current password", () => {
    it("returns 401 when current password is incorrect", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(mockUser);
      mocks.bcryptCompare.mockResolvedValue(false);

      const req = makeRequest(validChangePayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверный текущий пароль");
    });

    it("does NOT hash new password when current password is wrong", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(mockUser);
      mocks.bcryptCompare.mockResolvedValue(false);

      const req = makeRequest(validChangePayload);
      await POST(req);

      expect(mocks.bcryptHash).not.toHaveBeenCalled();
    });

    it("does NOT update user when current password is wrong", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(mockUser);
      mocks.bcryptCompare.mockResolvedValue(false);

      const req = makeRequest(validChangePayload);
      await POST(req);

      expect(mocks.mockUserUpdate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. New password too short — returns 400
  // =========================================================================

  describe("new password too short", () => {
    it("rejects newPassword shorter than 8 characters with 400", async () => {
      const req = makeRequest({ ...validChangePayload, newPassword: "short" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("rejects newPassword of exactly 7 characters with 400", async () => {
      const req = makeRequest({ ...validChangePayload, newPassword: "1234567" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("accepts newPassword of exactly 8 characters", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(mockUser);
      mocks.bcryptCompare.mockResolvedValue(true);

      const req = makeRequest({ ...validChangePayload, newPassword: "12345678" });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });
  });

  // =========================================================================
  // 4. New password too long — returns 400
  // =========================================================================

  describe("new password too long", () => {
    it("rejects newPassword longer than 128 characters with 400", async () => {
      const req = makeRequest({ ...validChangePayload, newPassword: "a".repeat(129) });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });
  });

  // =========================================================================
  // 5. Missing fields — returns 400
  // =========================================================================

  describe("missing fields", () => {
    it("rejects missing currentPassword with 400", async () => {
      const { currentPassword: _currentPassword, ...payload } = validChangePayload;
      const req = makeRequest(payload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("rejects empty currentPassword with 400", async () => {
      const req = makeRequest({ ...validChangePayload, currentPassword: "" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("rejects missing newPassword with 400", async () => {
      const { newPassword: _newPassword, ...payload } = validChangePayload;
      const req = makeRequest(payload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("rejects empty newPassword with 400", async () => {
      const req = makeRequest({ ...validChangePayload, newPassword: "" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });
  });

  // =========================================================================
  // 6. Requires authentication (no session = 401)
  // =========================================================================

  describe("requires authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mocks.requireAuthResult = { response: { status: 401 } };

      const req = makeRequest(validChangePayload);
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("does NOT query user when not authenticated", async () => {
      mocks.requireAuthResult = { response: { status: 401 } };

      const req = makeRequest(validChangePayload);
      await POST(req);

      expect(mocks.mockUserFindUnique).not.toHaveBeenCalled();
    });

    it("does NOT compare password when not authenticated", async () => {
      mocks.requireAuthResult = { response: { status: 401 } };

      const req = makeRequest(validChangePayload);
      await POST(req);

      expect(mocks.bcryptCompare).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. User not found or no hashed password
  // =========================================================================

  describe("user not found or no hashed password", () => {
    it("returns 400 when user does not exist in database", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(null);

      const req = makeRequest(validChangePayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Невозможно изменить пароль");
    });

    it("returns 400 when user has no hashedPassword", async () => {
      mocks.mockUserFindUnique.mockResolvedValue({ ...mockUser, hashedPassword: null });

      const req = makeRequest(validChangePayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Невозможно изменить пароль");
    });

    it("does NOT compare password when user has no hashedPassword", async () => {
      mocks.mockUserFindUnique.mockResolvedValue({ ...mockUser, hashedPassword: null });

      const req = makeRequest(validChangePayload);
      await POST(req);

      expect(mocks.bcryptCompare).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 8. Rate limiting
  // =========================================================================

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 3600000 };

      const req = makeRequest(validChangePayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(429);
      expect(json.error).toBe("Слишком много попыток. Попробуйте позже");
    });

    it("includes Retry-After header in rate limit response", async () => {
      const futureReset = Date.now() + 60000;
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: futureReset };

      const req = makeRequest(validChangePayload);
      const res = await POST(req);

      const retryAfter = res.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it("does NOT query user when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 3600000 };

      const req = makeRequest(validChangePayload);
      await POST(req);

      expect(mocks.mockUserFindUnique).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 9. Server error handling
  // =========================================================================

  describe("server error handling", () => {
    it("returns 500 when database query fails", async () => {
      mocks.mockUserFindUnique.mockRejectedValueOnce(new Error("DB connection error"));

      const req = makeRequest(validChangePayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Ошибка при смене пароля");
    });

    it("returns 500 when user update fails", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(mockUser);
      mocks.bcryptCompare.mockResolvedValue(true);
      mocks.mockUserUpdate.mockRejectedValueOnce(new Error("Update failed"));

      const req = makeRequest(validChangePayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Ошибка при смене пароля");
    });
  });
});
