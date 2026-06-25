import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock modules BEFORE importing the route handler
// vi.mock is hoisted, so we use vi.hoisted to define the mock variables
// ---------------------------------------------------------------------------

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserFindUnique: vi.fn(),
    mockVerificationTokenCreate: vi.fn(),
    mockVerificationTokenDeleteMany: vi.fn(),
    mockVerificationCodeCreate: vi.fn(),
    mockVerificationCodeDeleteMany: vi.fn(),
    sendEmail: vi.fn().mockResolvedValue(undefined),
    sendSMS: vi.fn().mockResolvedValue({ success: true }),
    generatePasswordResetEmail: vi.fn().mockReturnValue({ subject: "Reset", html: "<html>" }),
    generatePasswordResetSMS: vi.fn().mockReturnValue("Your reset code: 123456"),
    generateOTPCode: vi.fn().mockReturnValue("123456"),
    generateSecureToken: vi.fn().mockReturnValue("test-reset-token-123"),
    loggerError: vi.fn(),
    rateLimitResult: { limited: false, remaining: 4, resetAt: Date.now() + 3600000 },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.mockUserFindUnique,
    },
    verificationToken: {
      create: mocks.mockVerificationTokenCreate,
      deleteMany: mocks.mockVerificationTokenDeleteMany,
    },
    verificationCode: {
      create: mocks.mockVerificationCodeCreate,
      deleteMany: mocks.mockVerificationCodeDeleteMany,
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  generatePasswordResetEmail: mocks.generatePasswordResetEmail,
}));

vi.mock("@/lib/sms", () => ({
  sendSMS: mocks.sendSMS,
  generateOTPCode: mocks.generateOTPCode,
  generatePasswordResetSMS: mocks.generatePasswordResetSMS,
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
      forgotPassword: { max: 3, windowMs: 60 * 60 * 1000 },
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
  return new Request("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  phone: "+79001234567",
  name: "Test User",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimitResult = { limited: false, remaining: 4, resetAt: Date.now() + 3600000 };
    mocks.mockUserFindUnique.mockResolvedValue(null);
    mocks.sendEmail.mockResolvedValue(undefined);
    mocks.sendSMS.mockResolvedValue({ success: true });
    mocks.mockVerificationCodeCreate.mockResolvedValue({ id: "vc-123" });
    mocks.mockVerificationCodeDeleteMany.mockResolvedValue({ count: 0 });
  });

  // =========================================================================
  // 1. Successful forgot-password via email (user exists)
  // =========================================================================

  describe("successful forgot-password via email (user exists)", () => {
    it("creates a verification token and sends reset email, returns 200", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(mockUser);

      const req = makeRequest({ email: "test@example.com" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("If account exists, instructions sent to email");
      expect(json.method).toBe("email");
      expect(mocks.mockVerificationTokenCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identifier: "password-reset:user-123",
            token: "test-reset-token-123",
          }),
        })
      );
      expect(mocks.sendEmail).toHaveBeenCalled();
    });

    it("normalizes email to lowercase before lookup", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(mockUser);

      const req = makeRequest({ email: "TEST@EXAMPLE.COM" });
      await POST(req);

      expect(mocks.mockUserFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: "test@example.com" },
        })
      );
    });
  });

  // =========================================================================
  // 2. Unknown email — security: don't leak existence
  // =========================================================================

  describe("unknown email — security: don't leak existence", () => {
    it("returns 200 with same message and creates a dummy token to prevent timing attacks", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(null);

      const req = makeRequest({ email: "nonexistent@example.com" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("If account exists, instructions sent to email");
      expect(json.method).toBe("email");
      // A dummy token IS created so the DB write matches the real-user path timing,
      // preventing attackers from inferring email existence via response time.
      expect(mocks.mockVerificationTokenCreate).toHaveBeenCalledTimes(1);
      const createCall = mocks.mockVerificationTokenCreate.mock.calls[0][0];
      expect(createCall.data.identifier).toMatch(/^password-reset:dummy-/);
      expect(mocks.sendEmail).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. Successful forgot-password via phone (user exists)
  // =========================================================================

  describe("successful forgot-password via phone (user exists)", () => {
    it("creates a verification code and sends SMS, returns 200", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(mockUser);

      const req = makeRequest({ phone: "+79001234567" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("If account exists, code sent via SMS");
      expect(json.method).toBe("phone");
      expect(mocks.generateOTPCode).toHaveBeenCalled();
      expect(mocks.sendSMS).toHaveBeenCalled();
    });

    it("trims phone number before lookup", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(mockUser);

      const req = makeRequest({ phone: "  +79001234567  " });
      await POST(req);

      expect(mocks.mockUserFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { phone: "+79001234567" },
        })
      );
    });
  });

  // =========================================================================
  // 4. Unknown phone — security: don't leak existence
  // =========================================================================

  describe("unknown phone — security: don't leak existence", () => {
    it("returns 200 with same message and creates a dummy OTP to prevent timing attacks", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(null);

      const req = makeRequest({ phone: "+79999999999" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("If account exists, code sent via SMS");
      expect(json.method).toBe("phone");
      // A dummy OTP IS created so the DB write matches the real-user path timing.
      expect(mocks.mockVerificationCodeCreate).toHaveBeenCalledTimes(1);
      const createCall = mocks.mockVerificationCodeCreate.mock.calls[0][0];
      expect(createCall.data.phone).toMatch(/^dummy-/);
      expect(mocks.sendSMS).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. Validation errors
  // =========================================================================

  describe("validation errors", () => {
    it("rejects missing email and phone with 400", async () => {
      const req = makeRequest({});
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid data");
    });

    it("rejects invalid email format with 400", async () => {
      const req = makeRequest({ email: "not-an-email" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid data");
    });

    it("rejects phone that is too long with 400", async () => {
      const req = makeRequest({ phone: "1".repeat(21) });
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

      const req = makeRequest({ email: "test@example.com" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(429);
      expect(json.error).toBe("Too many attempts. Please try later");
    });

    it("includes Retry-After header in rate limit response", async () => {
      const futureReset = Date.now() + 60000;
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: futureReset };

      const req = makeRequest({ email: "test@example.com" });
      const res = await POST(req);

      const retryAfter = res.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it("does NOT query database when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 3600000 };

      const req = makeRequest({ email: "test@example.com" });
      await POST(req);

      expect(mocks.mockUserFindUnique).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. Email send failure (503)
  // =========================================================================

  describe("email send failure", () => {
    it("returns 503 and deletes token when email sending fails", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(mockUser);
      mocks.sendEmail.mockRejectedValueOnce(new Error("SMTP error"));

      const req = makeRequest({ email: "test@example.com" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json.error).toBe("Failed to send email. Please try later");
      expect(mocks.mockVerificationTokenDeleteMany).toHaveBeenCalled();
      expect(mocks.loggerError).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 8. SMS send failure (503)
  // =========================================================================

  describe("SMS send failure", () => {
    it("returns 503 when SMS sending fails", async () => {
      mocks.mockUserFindUnique.mockResolvedValue(mockUser);
      mocks.sendSMS.mockResolvedValueOnce({ success: false, error: "SMS gateway error" });

      const req = makeRequest({ phone: "+79001234567" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json.error).toBe("Failed to send SMS. Please try later");
    });
  });

  // =========================================================================
  // 9. Server error handling
  // =========================================================================

  describe("server error handling", () => {
    it("returns 500 when database query fails", async () => {
      mocks.mockUserFindUnique.mockRejectedValueOnce(new Error("DB connection error"));

      const req = makeRequest({ email: "test@example.com" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});
