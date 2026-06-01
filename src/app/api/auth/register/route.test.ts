import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock modules BEFORE importing the route handler
// vi.mock is hoisted, so we use vi.hoisted to define the mock variables
// ---------------------------------------------------------------------------

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserCreate: vi.fn(),
    mockUserFindFirst: vi.fn(),
    mockVerificationTokenCreate: vi.fn(),
    sendEmail: vi.fn().mockResolvedValue(undefined),
    generateVerificationEmail: vi.fn().mockReturnValue({ subject: "Verify", html: "<html>" }),
    generateSecureToken: vi.fn().mockReturnValue("test-token-123"),
    loggerError: vi.fn(),
    rateLimitResult: { limited: false, remaining: 2, resetAt: Date.now() + 3600000 },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findFirst: mocks.mockUserFindFirst,
      create: mocks.mockUserCreate,
    },
    verificationToken: {
      create: mocks.mockVerificationTokenCreate,
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  generateVerificationEmail: mocks.generateVerificationEmail,
}));

vi.mock("@/lib/crypto", () => ({
  generateSecureToken: mocks.generateSecureToken,
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
      register: { max: 3, windowMs: 60 * 60 * 1000 },
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
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  name: "Test User",
  email: "test@example.com",
  phone: "+79001234567",
  password: "SecurePass123!",
};

const mockCreatedUser = {
  id: "user-123",
  name: "Test User",
  email: "test@example.com",
  phone: "+79001234567",
  role: "STUDENT",
  createdAt: new Date(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimitResult = { limited: false, remaining: 2, resetAt: Date.now() + 3600000 };
    mocks.mockUserFindFirst.mockResolvedValue(null);
    mocks.mockUserCreate.mockResolvedValue(mockCreatedUser);
    mocks.mockVerificationTokenCreate.mockResolvedValue({ id: "vt-123" });
  });

  // =========================================================================
  // 1. Successful registration
  // =========================================================================

  describe("successful registration", () => {
    it("creates a user and returns 201 with all required fields", async () => {
      const req = makeRequest(validPayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.message).toContain("Пользователь создан");
      expect(json.user).toMatchObject({
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      });
    });

    it("defaults role to STUDENT when not in request", async () => {
      const req = makeRequest(validPayload);
      await POST(req);

      expect(mocks.mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: "STUDENT",
          }),
        })
      );
    });

    it("accepts TEACHER role from request body", async () => {
      const req = makeRequest({ ...validPayload, role: "TEACHER" });
      await POST(req);

      expect(mocks.mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: "TEACHER",
          }),
        })
      );
    });

    it("normalizes email to lowercase and trimmed", async () => {
      const req = makeRequest({ ...validPayload, email: "Test@Example.COM" });
      await POST(req);

      expect(mocks.mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "test@example.com",
          }),
        })
      );
    });

    it("trims name and phone before saving", async () => {
      const req = makeRequest({ ...validPayload, name: "  Test User  ", phone: "  +79001234567  " });
      await POST(req);

      expect(mocks.mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Test User",
            phone: "+79001234567",
          }),
        })
      );
    });

    it("accepts null phone", async () => {
      const req = makeRequest({ ...validPayload, phone: null });
      const res = await POST(req);

      expect(res.status).toBe(201);
    });

    it("accepts optional name missing (name is optional)", async () => {
      const { name: _name, ...payloadWithoutName } = validPayload;
      const req = makeRequest(payloadWithoutName);
      const res = await POST(req);

      expect(res.status).toBe(201);
    });

    it("rejects empty name with 400", async () => {
      const req = makeRequest({ ...validPayload, name: "" });
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(res.ok).toBe(false);
    });
  });

  // =========================================================================
  // 2. Role handling — users can select STUDENT or TEACHER, but not ADMIN
  // =========================================================================

  describe("role handling", () => {
    it("accepts TEACHER role from request body", async () => {
      const req = makeRequest({ ...validPayload, role: "TEACHER" });
      await POST(req);

      expect(mocks.mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: "TEACHER",
          }),
        })
      );
    });

    it("rejects ADMIN role in request body — returns 400", async () => {
      const req = makeRequest({ ...validPayload, role: "ADMIN" });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 3. Validation errors
  // =========================================================================

  describe("validation errors", () => {
    it("rejects missing email with 400", async () => {
      const { email: _email, ...payloadWithoutEmail } = validPayload;
      const req = makeRequest(payloadWithoutEmail);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("rejects invalid email format with 400", async () => {
      const req = makeRequest({ ...validPayload, email: "not-an-email" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("rejects password shorter than 8 characters with 400", async () => {
      const req = makeRequest({ ...validPayload, password: "short" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("rejects missing password with 400", async () => {
      const { password: _password, ...payloadWithoutPassword } = validPayload;
      const req = makeRequest(payloadWithoutPassword);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("rejects email that is too long with 400", async () => {
      const req = makeRequest({ ...validPayload, email: "a".repeat(257) + "@example.com" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("rejects password that is too long with 400", async () => {
      const req = makeRequest({ ...validPayload, password: "a".repeat(129) });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("rejects name that is too long with 400", async () => {
      const req = makeRequest({ ...validPayload, name: "a".repeat(101) });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });

    it("rejects phone that is too long with 400", async () => {
      const req = makeRequest({ ...validPayload, phone: "1".repeat(21) });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Неверные данные");
    });
  });

  // =========================================================================
  // 4. Duplicate email / phone rejection
  // =========================================================================

  describe("duplicate email / phone rejection", () => {
    it("rejects duplicate email with 409", async () => {
      mocks.mockUserFindFirst.mockResolvedValue({ email: "test@example.com", phone: null });

      const req = makeRequest(validPayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain("email");
    });

    it("rejects duplicate phone with 409", async () => {
      mocks.mockUserFindFirst.mockResolvedValue({ email: "other@example.com", phone: "+79001234567" });

      const req = makeRequest(validPayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain("номером телефона");
    });

    it("allows registration when no existing user found", async () => {
      mocks.mockUserFindFirst.mockResolvedValue(null);

      const req = makeRequest(validPayload);
      const res = await POST(req);

      expect(res.status).toBe(201);
    });
  });

  // =========================================================================
  // 5. Rate limiting
  // =========================================================================

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 3600000 };

      const req = makeRequest(validPayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(429);
      expect(json.error).toBe("Слишком много попыток. Попробуйте позже");
      expect(res.headers.get("Retry-After")).toBeDefined();
    });

    it("includes Retry-After header in rate limit response", async () => {
      const futureReset = Date.now() + 60000;
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: futureReset };

      const req = makeRequest(validPayload);
      const res = await POST(req);

      const retryAfter = res.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it("does NOT call db when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 3600000 };

      const req = makeRequest(validPayload);
      await POST(req);

      expect(mocks.mockUserFindFirst).not.toHaveBeenCalled();
      expect(mocks.mockUserCreate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 6. Email send failure (graceful degradation)
  // =========================================================================

  describe("email send failure", () => {
    it("still returns 201 when email sending fails", async () => {
      mocks.sendEmail.mockRejectedValueOnce(new Error("SMTP error"));

      const req = makeRequest(validPayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.message).toContain("Обратитесь к преподавателю");
      expect(json.user).toBeDefined();
    });
  });

  // =========================================================================
  // 7. Server error handling
  // =========================================================================

  describe("server error handling", () => {
    it("returns 500 when database creation fails", async () => {
      mocks.mockUserCreate.mockRejectedValueOnce(new Error("DB connection error"));

      const req = makeRequest(validPayload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Ошибка при регистрации");
    });
  });
});
