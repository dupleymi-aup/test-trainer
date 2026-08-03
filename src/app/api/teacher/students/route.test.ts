import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockUserFindMany: vi.fn(),
    mockParseSearchParams: vi.fn(),
    guardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    groupGuardResult: null as
      | { group: { id: string } }
      | { response: NextResponse }
      | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findMany: mocks.mockUserFindMany },
  },
}));

vi.mock("@/lib/admin-guard", () => {
  const m = mocks;
  return {
    requireTeacherOrAdmin: vi.fn().mockImplementation(async () => {
      if (m.guardResult) return m.guardResult;
      return { session: { userId: "teacher-1", role: "TEACHER" } };
    }),
    requireTeacherGroup: vi.fn().mockImplementation(async () => {
      if (m.groupGuardResult) return m.groupGuardResult;
      return { group: { id: "g1" } };
    }),
  };
});

vi.mock("@/lib/api-error-handler", () => ({
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
  unwrapGuard: vi.fn(<T>(result: { session: T } | { response: NextResponse }): T => {
    if ("response" in result) {
      const err = new Error("Unauthorized") as Error & { statusCode: number };
      err.statusCode = result.response.status;
      throw err;
    }
    return (result as { session: T }).session;
  }),
  unwrapGroupGuard: vi.fn(<T>(result: { group: T } | { response: NextResponse }): T => {
    if ("response" in result) {
      const err = new Error("Forbidden") as Error & { statusCode: number };
      err.statusCode = result.response.status;
      throw err;
    }
    return (result as { group: T }).group;
  }),
  parseSearchParams: mocks.mockParseSearchParams,
}));

import { GET } from "./route";

function makeRequest(query = "") {
  return new Request(`http://localhost:3000/api/teacher/students${query}`);
}

const mockStudent = {
  id: "u1",
  name: "Alice",
  email: "alice@test.com",
  phone: "+7-999-111-22-33",
  university: "MGU",
  group: "MGU-101",
  createdAt: new Date("2024-01-15"),
  attempts: [
    {
      score: 90,
      ecCoverage: 0.6,
      bvCoverage: 0.4,
      createdAt: new Date("2024-06-02"),
    },
    {
      score: 70,
      ecCoverage: 0.5,
      bvCoverage: 0.5,
      createdAt: new Date("2024-05-01"),
    },
  ],
};

describe("GET /api/teacher/students", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.guardResult = { session: { userId: "teacher-1", role: "TEACHER" } };
    mocks.groupGuardResult = { group: { id: "g1" } };
    mocks.mockParseSearchParams.mockReturnValue({
      success: true,
      data: { groupId: "g1" },
    });
    mocks.mockUserFindMany.mockResolvedValue([mockStudent]);
  });

  it("returns students with progress stats", async () => {
    const res = await GET(makeRequest("?groupId=g1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.students).toHaveLength(1);
    const s = body.students[0];
    expect(s.bestScore).toBe(90);
    expect(s.attemptsCount).toBe(2);
    expect(s.avgEc).toBe(1);
    expect(s.avgBv).toBe(0);
    expect(s.lastAttempt).toBe("2024-06-02T00:00:00.000Z");
    expect(mocks.mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: "STUDENT", deletedAt: null, groups: { some: { groupId: "g1" } } },
      })
    );
  });

  it("passes search filter", async () => {
    mocks.mockParseSearchParams.mockReturnValue({
      success: true,
      data: { groupId: "g1", search: "alice" },
    });

    const res = await GET(makeRequest("?groupId=g1&search=alice"));
    expect(res.status).toBe(200);
    expect(mocks.mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: "alice" } },
            { email: { contains: "alice" } },
            { phone: { contains: "alice" } },
          ],
        }),
      })
    );
  });

  it("handles student without attempts", async () => {
    mocks.mockUserFindMany.mockResolvedValue([{ ...mockStudent, attempts: [] }]);

    const res = await GET(makeRequest("?groupId=g1"));
    expect(res.status).toBe(200);
    const s = (await res.json()).students[0];
    expect(s.bestScore).toBe(0);
    expect(s.avgEc).toBe(0);
    expect(s.lastAttempt).toBeNull();
  });

  it("returns 400 on invalid params", async () => {
    mocks.mockParseSearchParams.mockReturnValue({
      success: false,
      errorResponse: NextResponse.json({ error: "Invalid params" }, { status: 400 }),
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns 403 when teacher does not own the group", async () => {
    mocks.groupGuardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    const res = await GET(makeRequest("?groupId=g2"));
    expect(res.status).toBe(403);
    expect(mocks.mockUserFindMany).not.toHaveBeenCalled();
  });

  it("returns 403 when unauthorized", async () => {
    mocks.guardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    const res = await GET(makeRequest("?groupId=g1"));
    expect(res.status).toBe(403);
  });
});
