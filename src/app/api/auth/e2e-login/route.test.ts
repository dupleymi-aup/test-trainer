import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockParseRequestBody: vi.fn(),
  },
}));

vi.mock("@/lib/api-error-handler", () => ({
  parseRequestBody: mocks.mockParseRequestBody,
  withErrorHandler: vi.fn(async (_req: unknown, handler: () => Promise<NextResponse>) => {
    try {
      return await handler();
    } catch (err: unknown) {
      const appErr = err as { statusCode?: number; message?: string };
      if (appErr.statusCode) {
        return NextResponse.json({ error: appErr.message || "Error" }, { status: appErr.statusCode });
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }),
}));

import { POST } from "./route";

const originalNodeEnv = process.env.NODE_ENV;

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/auth/e2e-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setNodeEnv(value: string) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe("POST /api/auth/e2e-login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setNodeEnv("development");
    mocks.mockParseRequestBody.mockResolvedValue({
      success: true,
      data: { email: "teacher@testtrainer.local", password: "teacher123" },
    });
  });

  afterEach(() => {
    setNodeEnv(originalNodeEnv ?? "test");
  });

  it("returns 404 in production", async () => {
    setNodeEnv("production");
    const res = await POST(makeRequest({ email: "teacher@testtrainer.local" }));
    expect(res.status).toBe(404);
    expect(mocks.mockParseRequestBody).not.toHaveBeenCalled();
  });

  it("logs in teacher with e2e credentials", async () => {
    const res = await POST(makeRequest({ email: "teacher@testtrainer.local", password: "teacher123" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user).toEqual({
      id: "teacher-id",
      name: "Teacher",
      email: "teacher@testtrainer.local",
      role: "TEACHER",
    });
    expect(body.sessionToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it("logs in student with e2e credentials", async () => {
    mocks.mockParseRequestBody.mockResolvedValue({
      success: true,
      data: { email: "student@testtrainer.local", password: "student123" },
    });
    const res = await POST(makeRequest({ email: "student@testtrainer.local", password: "student123" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.role).toBe("STUDENT");
    expect(body.user.id).toBe("student-id");
  });

  it("returns 401 for invalid credentials", async () => {
    mocks.mockParseRequestBody.mockResolvedValue({
      success: true,
      data: { email: "evil@test.com", password: "nope" },
    });
    const res = await POST(makeRequest({ email: "evil@test.com", password: "nope" }));
    expect(res.status).toBe(401);
  });

  it("returns error response on validation failure", async () => {
    mocks.mockParseRequestBody.mockResolvedValue({
      success: false,
      errorResponse: NextResponse.json({ error: "Invalid email" }, { status: 400 }),
    });
    const res = await POST(makeRequest({ email: "" }));
    expect(res.status).toBe(400);
  });
});
