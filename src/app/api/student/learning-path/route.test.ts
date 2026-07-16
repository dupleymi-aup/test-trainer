import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    guardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    findManyUserGroup: vi.fn(),
    findManyAssignment: vi.fn(),
    findManyAttempt: vi.fn(),
    loggerError: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    userGroup: {
      findMany: mocks.findManyUserGroup,
    },
    templateAssignment: {
      findMany: mocks.findManyAssignment,
    },
    attempt: {
      findMany: mocks.findManyAttempt,
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

vi.mock("@/lib/admin-guard", () => ({
  requireStudent: vi.fn().mockImplementation(async () => {
    if (mocks.guardResult) return mocks.guardResult;
    return { session: { userId: "student-1", role: "STUDENT" } };
  }),
}));

vi.mock("@/lib/api-error-handler", () => ({
  withErrorHandler: vi.fn(async (_req: unknown, handler: () => Promise<NextResponse>) => {
    try {
      return await handler();
    } catch (error: unknown) {
      const appErr = error as { statusCode?: number; message?: string };
      if (appErr.statusCode) {
        return NextResponse.json({ error: appErr.message || "Error" }, { status: appErr.statusCode });
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }),
  unwrapGuard: vi.fn(<T>(result: { session: T } | { response: Response; status: number }): T => {
    if ("response" in result) {
      const err = new Error("Error") as Error & { statusCode: number };
      err.statusCode = result.response.status;
      throw err;
    }
    return (result as { session: T }).session;
  }),
}));

import { GET } from "./route";

function setAuthorized() {
  mocks.guardResult = { session: { userId: "student-1", role: "STUDENT" } };
}

function setUnauthorized() {
  mocks.guardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

describe("GET /api/student/learning-path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthorized();
  });

  it("returns 403 when not authenticated", async () => {
    setUnauthorized();
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns empty when user has no groups", async () => {
    mocks.findManyUserGroup.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assignments).toEqual([]);
    expect(body.progress).toEqual({});
  });

  it("returns assignments and progress for user groups", async () => {
    mocks.findManyUserGroup.mockResolvedValue([{ groupId: "group-1" }]);
    mocks.findManyAssignment.mockResolvedValue([
      {
        id: "assign-1",
        assignedAt: new Date("2026-01-01").toISOString(),
        template: {
          id: "tpl-1",
          name: "Equivalence Classes",
          description: "Practice EC",
          taskIds: JSON.stringify([1, 2, 3]),
          topics: ["equivalence"],
          estimatedHours: 2,
        },
        group: { id: "group-1", name: "Group A" },
      },
    ]);
    mocks.findManyAttempt.mockResolvedValue([
      { taskId: "1", score: 80 },
      { taskId: "2", score: 40 },
      { taskId: "3", score: 90 },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.assignments).toHaveLength(1);
    expect(body.assignments[0].template.name).toBe("Equivalence Classes");

    expect(body.progress["tpl-1"]).toEqual({
      templateId: "tpl-1",
      completedTasks: 2,
      totalTasks: 3,
    });
  });

  it("queries groups by current user", async () => {
    mocks.findManyUserGroup.mockResolvedValue([]);
    await GET();
    expect(mocks.findManyUserGroup).toHaveBeenCalledWith({
      where: { userId: "student-1" },
      select: { groupId: true },
    });
  });

  it("queries assignments by group ids", async () => {
    mocks.findManyUserGroup.mockResolvedValue([{ groupId: "g1" }, { groupId: "g2" }]);
    mocks.findManyAssignment.mockResolvedValue([]);
    mocks.findManyAttempt.mockResolvedValue([]);
    await GET();
    expect(mocks.findManyAssignment).toHaveBeenCalledWith({
      where: { groupId: { in: ["g1", "g2"] } },
      include: expect.objectContaining({ template: expect.anything() }),
      orderBy: { assignedAt: "desc" },
    });
  });

  it("handles missing attempts gracefully (no attempts)", async () => {
    mocks.findManyUserGroup.mockResolvedValue([{ groupId: "g1" }]);
    mocks.findManyAssignment.mockResolvedValue([
      { id: "a1", assignedAt: new Date().toISOString(), template: { id: "t1", name: "Test", description: "", taskIds: JSON.stringify([1]), topics: [], estimatedHours: 1 }, group: { id: "g1", name: "G" } },
    ]);
    mocks.findManyAttempt.mockResolvedValue([]);
    const res = await GET();
    const body = await res.json();
    expect(body.progress["t1"].completedTasks).toBe(0);
  });

  it("handles invalid JSON in taskIds gracefully", async () => {
    mocks.findManyUserGroup.mockResolvedValue([{ groupId: "g1" }]);
    mocks.findManyAssignment.mockResolvedValue([
      { id: "a1", assignedAt: new Date().toISOString(), template: { id: "t1", name: "Test", description: "", taskIds: "not-json", topics: [], estimatedHours: 1 }, group: { id: "g1", name: "G" } },
    ]);
    mocks.findManyAttempt.mockResolvedValue([]);
    const res = await GET();
    const body = await res.json();
    expect(body.progress["t1"].totalTasks).toBe(0);
    expect(body.progress["t1"].completedTasks).toBe(0);
  });

  it("handles db error gracefully", async () => {
    mocks.findManyUserGroup.mockRejectedValue(new Error("DB down"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
