import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockGroupFindMany: vi.fn(),
    mockGroupCreate: vi.fn(),
    loggerError: vi.fn(),
    guardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    csrfResult: { verified: true } as { verified: boolean } | { response: NextResponse },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    group: {
      findMany: mocks.mockGroupFindMany,
      create: mocks.mockGroupCreate,
    },
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

vi.mock("@/lib/admin-guard", () => {
  const m = mocks;
  return {
    requireTeacherOrAdmin: vi.fn().mockImplementation(async () => {
      if (m.guardResult) return m.guardResult;
      return { session: { userId: "teacher-1", role: "TEACHER" } };
    }),
  };
});

vi.mock("@/lib/csrf-middleware", () => ({
  requireCSRF: vi.fn().mockImplementation(async () => mocks.csrfResult),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ limited: false, resetAt: Date.now() + 60000 }),
  createRateLimitResponse: vi.fn().mockReturnValue(
    NextResponse.json({ error: "Too many requests" }, { status: 429 })
  ),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  rateLimits: { teacherGroupCrud: { window: 60000, max: 30 } },
}));

import { GET, POST } from "./route";

function makePostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/teacher/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setAuthorized(role: string = "TEACHER") {
  mocks.guardResult = { session: { userId: "teacher-1", role } };
}

function setUnauthorized() {
  mocks.guardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

const mockGroups = [
  {
    id: "g-1", name: "QA-2024", description: "My group",
    createdAt: new Date("2024-01-01"), createdByUserId: "teacher-1",
    _count: { members: 5 },
    createdBy: { name: "Teacher", email: "teacher@test.com" },
  },
];

describe("GET /api/teacher/groups", () => {
  beforeEach(() => {
    setAuthorized();
    mocks.mockGroupFindMany.mockResolvedValue(mockGroups);
  });

  it("returns teacher's own groups", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.groups).toHaveLength(1);
    expect(mocks.mockGroupFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdByUserId: "teacher-1" } })
    );
  });

  it("returns all groups for admin", async () => {
    setAuthorized("ADMIN");
    await GET();
    expect(mocks.mockGroupFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it("returns 403 when unauthorized", async () => {
    setUnauthorized();
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns empty list when teacher has no groups", async () => {
    mocks.mockGroupFindMany.mockResolvedValue([]);
    const res = await GET();
    const body = await res.json();
    expect(body.groups).toEqual([]);
  });

  it("handles db error gracefully", async () => {
    mocks.mockGroupFindMany.mockRejectedValue(new Error("DB down"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/teacher/groups", () => {
  beforeEach(() => {
    setAuthorized();
    mocks.csrfResult = { verified: true };
    mocks.mockGroupCreate.mockResolvedValue({
      id: "g-new", name: "New Group", _count: { members: 0 },
    });
  });

  it("creates a group and returns 201", async () => {
    const res = await POST(makePostRequest({ name: "New Group", description: "Desc" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.group.name).toBe("New Group");
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is too long", async () => {
    const res = await POST(makePostRequest({ name: "x".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when description is too long", async () => {
    const res = await POST(makePostRequest({ name: "Valid", description: "x".repeat(1001) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost:3000/api/teacher/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when unauthorized", async () => {
    setUnauthorized();
    const res = await POST(makePostRequest({ name: "New Group" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when CSRF fails", async () => {
    mocks.csrfResult = {
      response: NextResponse.json({ error: "CSRF missing" }, { status: 403 }),
    };
    const res = await POST(makePostRequest({ name: "New Group" }));
    expect(res.status).toBe(403);
  });

  it("handles db error gracefully", async () => {
    mocks.mockGroupCreate.mockRejectedValue(new Error("DB down"));
    const res = await POST(makePostRequest({ name: "New Group" }));
    expect(res.status).toBe(500);
  });
});
