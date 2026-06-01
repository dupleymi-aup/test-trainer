import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock modules BEFORE importing the route handler
// vi.mock is hoisted, so we use vi.hoisted to define the mock variables
// ---------------------------------------------------------------------------

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserFindFirst: vi.fn(),
    bcryptCompare: vi.fn(),
    loggerError: vi.fn(),
    rateLimitResult: { limited: false, remaining: 4, resetAt: Date.now() + 15 * 60 * 1000 },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findFirst: mocks.mockUserFindFirst,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.bcryptCompare,
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
      login: { max: 5, windowMs: 15 * 60 * 1000 },
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
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validCredentials = {
  login: "test@example.com",
  password: "SecurePass123!",
};

const mockUser = {
  id: "user-123",
  name: "Test User",
  email: "test@example.com",
  phone: "+79001234567",
  role: "STUDENT",
  isActive: true,
  hashedPassword: "$2a$12$hashedpassword",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimitResult = { limited: false, remaining: 4, resetAt: Date.now() + 15 * 60 * 1000 };
    mocks.bcryptCompare.mockResolvedValue(false);
    mocks.mockUserFindFirst.mockResolvedValue(null);
  });

  // =========================================================================
  // 1. Successful login
  // =========================================================================

  describe("successful login", () => {
    it("returns 200 with user data for valid credentials", async () => {
      mocks.mockUserFindFirst.mockResolvedValue(mockUser);
      mocks.bcryptCompare.mockResolvedValue(true);

      const req = makeRequest(validCredentials);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.user).toMatchObject({
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        role: "STUDENT",
      });
      expect(json.user.hashedPassword).toBeUndefined();
    });

    it("normalizes email to lowercase before lookup", async () => {
      mocks.mockUserFindFirst.mockResolvedValue(mockUser);
      mocks.bcryptCompare.mockResolvedValue(true);

      const req = makeRequest({ ...validCredentials, login: "TEST@EXAMPLE.COM" });
      await POST(req);

      expect(mocks.mockUserFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: "test@example.com" },
        })
      );
    });

    it("looks up by phone when login looks like a phone number", async () => {
      mocks.mockUserFindFirst.mockResolvedValue({ ...mockUser, email: null, phone: "+79001234567" });
      mocks.bcryptCompare.mockResolvedValue(true);

      const req = makeRequest({ login: "+79001234567", password: "SecurePass123!" });
      await POST(req);

      expect(mocks.mockUserFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { phone: "+79001234567" },
        })
      );
    });

    it("trims whitespace from login input", async () => {
      mocks.mockUserFindFirst.mockResolvedValue(mockUser);
      mocks.bcryptCompare.mockResolvedValue(true);

      const req = makeRequest({ ...validCredentials, login: "  test@example.com  " });
      await POST(req);

      expect(mocks.mockUserFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: "test@example.com" },
        })
      );
    });
  });

  // =========================================================================
  // 2. Invalid credentials
  // =========================================================================

  describe("invalid credentials", () => {
    it("returns 401 when user not found", async () => {
      mocks.mockUserFindFirst.mockResolvedValue(null);

      const req = makeRequest(validCredentials);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Неверный email/телефон или пароль");
    });

    it("returns 401 when password is incorrect", async () => {
      mocks.mockUserFindFirst.mockResolvedValue(mockUser);
      mocks.bcryptCompare.mockResolvedValue(false);

      const req = makeRequest(validCredentials);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Неверный email/телефон или пароль");
    });

    it("returns 401 when user has no hashedPassword", async () => {
      mocks.mockUserFindFirst.mockResolvedValue({ ...mockUser, hashedPassword: null });

      const req = makeRequest(validCredentials);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Неверный email/телефон или пароль");
    });

    it("returns 403 when user account is inactive", async () => {
      mocks.mockUserFindFirst.mockResolvedValue({ ...mockUser, isActive: false });
      mocks.bcryptCompare.mockResolvedValue(true);

      const req = makeRequest(validCredentials);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("Аккаунт неактивен");
    });

    it("does NOT compare password for inactive users (early return)", async () => {
      mocks.mockUserFindFirst.mockResolvedValue({ ...mockUser, isActive: false });

      const req = makeRequest(validCredentials);
      await POST(req);

      expect(mocks.bcryptCompare).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. Missing fields
  // =========================================================================

  describe("missing fields", () => {
    it("rejects missing login with 400", async () => {
      const { login: _login, ...payload } = validCredentials;
      const req = makeRequest(payload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("rejects empty login with 400", async () => {
      const req = makeRequest({ ...validCredentials, login: "" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("rejects missing password with 400", async () => {
      const { password: _password, ...payload } = validCredentials;
      const req = makeRequest(payload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("rejects empty password with 400", async () => {
      const req = makeRequest({ ...validCredentials, password: "" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });
  });

  // =========================================================================
  // 4. Rate limiting
  // =========================================================================

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 900000 };

      const req = makeRequest(validCredentials);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(429);
      expect(json.error).toBe("Слишком много попыток. Попробуйте позже");
    });

    it("includes Retry-After header in rate limit response", async () => {
      const futureReset = Date.now() + 60000;
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: futureReset };

      const req = makeRequest(validCredentials);
      const res = await POST(req);

      const retryAfter = res.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it("does NOT query database when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 900000 };

      const req = makeRequest(validCredentials);
      await POST(req);

      expect(mocks.mockUserFindFirst).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. Server error handling
  // =========================================================================

  describe("server error handling", () => {
    it("returns 500 when database query fails", async () => {
      mocks.mockUserFindFirst.mockRejectedValueOnce(new Error("DB connection error"));

      const req = makeRequest(validCredentials);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Ошибка при входе");
    });
  });
});
