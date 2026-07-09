import { describe, it, expect, beforeEach, vi } from "vitest";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    requireAuth: vi.fn(),
    requireCSRF: vi.fn().mockReturnValue({ verified: true }),
    userFindUnique: vi.fn(),
    userUpdate: vi.fn(),
    bcryptCompare: vi.fn(),
    bcryptHash: vi.fn().mockResolvedValue("$2a$12$hashednewpw"),
    rateLimitResult: { limited: false, remaining: 4, resetAt: Date.now() + 900000 },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.bcryptCompare,
    hash: mocks.bcryptHash,
  },
}));

vi.mock("@/lib/admin-guard", () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/csrf-middleware", () => ({
  requireCSRF: mocks.requireCSRF,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockImplementation(() => mocks.rateLimitResult),
  rateLimits: { changePassword: { max: 5, windowMs: 900000 } },
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
}));

import { POST } from "./route";

const authedSession = { session: { userId: "user-1", role: "STUDENT" } };
const activeUser = {
  id: "user-1",
  hashedPassword: "$2a$12$oldhash",
};

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/change-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue(authedSession);
    mocks.userFindUnique.mockResolvedValue(activeUser);
    mocks.userUpdate.mockResolvedValue({ id: "user-1" });
    mocks.bcryptCompare.mockResolvedValue(true);
    mocks.requireCSRF.mockReturnValue({ verified: true });
    mocks.rateLimitResult = { limited: false, remaining: 4, resetAt: Date.now() + 900000 };
  });

  // =========================================================================
  // 1. Successful password change
  // =========================================================================

  describe("successful password change", () => {
    it("changes password with valid current password", async () => {
      const res = await POST(makeRequest({
        currentPassword: "OldPass123!",
        newPassword: "NewPass456!",
      }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("Password changed successfully");
    });

    it("hashes new password with bcrypt cost 12", async () => {
      await POST(makeRequest({
        currentPassword: "OldPass123!",
        newPassword: "NewPass456!",
      }));

      expect(mocks.bcryptHash).toHaveBeenCalledWith("NewPass456!", 12);
    });

    it("updates user with new hashed password and invalidates sessions", async () => {
      await POST(makeRequest({
        currentPassword: "OldPass123!",
        newPassword: "NewPass456!",
      }));

      expect(mocks.userUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({
            hashedPassword: "$2a$12$hashednewpw",
            lastSessionInvalidation: expect.any(Date),
          }),
        })
      );
    });
  });

  // =========================================================================
  // 2. Invalid current password
  // =========================================================================

  describe("invalid current password", () => {
    it("returns 400 when current password is wrong", async () => {
      mocks.bcryptCompare.mockResolvedValue(false);

      const res = await POST(makeRequest({
        currentPassword: "WrongPass!",
        newPassword: "NewPass456!",
      }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid current password");
    });

    it("does NOT update user when current password is wrong", async () => {
      mocks.bcryptCompare.mockResolvedValue(false);

      await POST(makeRequest({
        currentPassword: "WrongPass!",
        newPassword: "NewPass456!",
      }));

      expect(mocks.userUpdate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. User without password (OAuth-only account)
  // =========================================================================

  describe("user without password", () => {
    it("returns 400 when user has no hashedPassword", async () => {
      mocks.userFindUnique.mockResolvedValue({ id: "user-1", hashedPassword: null });

      const res = await POST(makeRequest({
        currentPassword: "OldPass123!",
        newPassword: "NewPass456!",
      }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Cannot change password");
    });
  });

  // =========================================================================
  // 4. Validation
  // =========================================================================

  describe("validation", () => {
    it("rejects missing currentPassword", async () => {
      const res = await POST(makeRequest({ newPassword: "NewPass456!" }));
      expect(res.status).toBe(400);
    });

    it("rejects missing newPassword", async () => {
      const res = await POST(makeRequest({ currentPassword: "OldPass123!" }));
      expect(res.status).toBe(400);
    });

    it("rejects weak newPassword", async () => {
      const res = await POST(makeRequest({
        currentPassword: "OldPass123!",
        newPassword: "weak",
      }));
      expect(res.status).toBe(400);
    });

    it("rejects newPassword shorter than 8 characters", async () => {
      const res = await POST(makeRequest({
        currentPassword: "OldPass123!",
        newPassword: "Ab1!",
      }));
      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 5. Authentication
  // =========================================================================

  describe("authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mocks.requireAuth.mockResolvedValue({
        response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
      });

      const res = await POST(makeRequest({
        currentPassword: "OldPass123!",
        newPassword: "NewPass456!",
      }));

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 6. CSRF
  // =========================================================================

  describe("CSRF protection", () => {
    it("returns 403 when CSRF verification fails", async () => {
      mocks.requireCSRF.mockReturnValue({
        response: new Response(JSON.stringify({ error: "CSRF token missing" }), { status: 403 }),
      });

      const res = await POST(makeRequest({
        currentPassword: "OldPass123!",
        newPassword: "NewPass456!",
      }));

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 7. Rate limiting
  // =========================================================================

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      mocks.rateLimitResult = { limited: true, remaining: 0, resetAt: Date.now() + 900000 };

      const res = await POST(makeRequest({
        currentPassword: "OldPass123!",
        newPassword: "NewPass456!",
      }));
      const json = await res.json();

      expect(res.status).toBe(429);
    });
  });

  // =========================================================================
  // 8. Server errors
  // =========================================================================

  describe("server errors", () => {
    it("returns 500 when database update fails", async () => {
      mocks.userUpdate.mockRejectedValue(new Error("DB error"));

      const res = await POST(makeRequest({
        currentPassword: "OldPass123!",
        newPassword: "NewPass456!",
      }));
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});
