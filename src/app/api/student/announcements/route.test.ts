import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    guardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    findManyUserGroup: vi.fn(),
    findManyAnnouncement: vi.fn(),
    loggerError: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    userGroup: {
      findMany: mocks.findManyUserGroup,
    },
    announcement: {
      findMany: mocks.findManyAnnouncement,
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

function makeGetRequest() {
  return new Request("http://localhost:3000/api/student/announcements");
}

function setAuthorized() {
  mocks.guardResult = { session: { userId: "student-1", role: "STUDENT" } };
}

function setUnauthorized() {
  mocks.guardResult = {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

describe("GET /api/student/announcements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthorized();
  });

  it("returns 403 when not authenticated", async () => {
    setUnauthorized();
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("returns empty announcements list", async () => {
    mocks.findManyUserGroup.mockResolvedValue([]);
    mocks.findManyAnnouncement.mockResolvedValue([]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.announcements).toEqual([]);
  });

  it("returns system-wide and group announcements", async () => {
    mocks.findManyUserGroup.mockResolvedValue([{ groupId: "g-1" }]);
    const announcements = [
      { id: "a1", title: "System", group: null, creator: { id: "admin", name: "Admin", role: "ADMIN" } },
      { id: "a2", title: "Group", group: { id: "g-1", name: "Group A" }, creator: { id: "t1", name: "Teacher", role: "TEACHER" } },
    ];
    mocks.findManyAnnouncement.mockResolvedValue(announcements);
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.announcements).toHaveLength(2);
    expect(body.announcements[0].title).toBe("System");
    expect(body.announcements[1].title).toBe("Group");
  });

  it("queries announcements for user groups and system-wide", async () => {
    mocks.findManyUserGroup.mockResolvedValue([{ groupId: "g-1" }, { groupId: "g-2" }]);
    mocks.findManyAnnouncement.mockResolvedValue([]);
    await GET(makeGetRequest());
    expect(mocks.findManyAnnouncement).toHaveBeenCalledWith({
      where: {
        OR: [
          { groupId: { in: ["g-1", "g-2"] } },
          { groupId: null },
        ],
        AND: {
          OR: [
            { expiresAt: { gt: expect.any(Date) } },
            { expiresAt: null },
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      include: expect.objectContaining({ group: expect.anything(), creator: expect.anything() }),
      take: 50,
    });
  });

  it("handles db error gracefully", async () => {
    mocks.findManyUserGroup.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

