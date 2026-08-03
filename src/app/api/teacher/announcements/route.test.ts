import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockGroupFindMany: vi.fn(),
    mockGroupFindUnique: vi.fn(),
    mockAnnouncementFindMany: vi.fn(),
    mockAnnouncementCreate: vi.fn(),
    mockAnnouncementFindUnique: vi.fn(),
    mockAnnouncementUpdate: vi.fn(),
    mockAnnouncementDelete: vi.fn(),
    mockActivityLogCreate: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockCreateRateLimitResponse: vi.fn(),
    mockGetClientIp: vi.fn(),
    guardResult: null as
      | { session: { userId: string; role: string } }
      | { response: NextResponse }
      | null,
    csrfResult: null as { verified: true } | { response: NextResponse } | null,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    group: { findMany: mocks.mockGroupFindMany, findUnique: mocks.mockGroupFindUnique },
    announcement: {
      findMany: mocks.mockAnnouncementFindMany,
      create: mocks.mockAnnouncementCreate,
      findUnique: mocks.mockAnnouncementFindUnique,
      update: mocks.mockAnnouncementUpdate,
      delete: mocks.mockAnnouncementDelete,
    },
    activityLog: {
      create: mocks.mockActivityLogCreate,
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.mockCheckRateLimit,
  createRateLimitResponse: mocks.mockCreateRateLimitResponse,
  getClientIp: mocks.mockGetClientIp,
  rateLimits: { teacherAnnouncements: { max: 30, windowMs: 60000 } },
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

vi.mock("@/lib/csrf-middleware", () => {
  const m = mocks;
  return {
    requireCSRF: vi.fn().mockImplementation(async () => {
      if (m.csrfResult) return m.csrfResult;
      return { verified: true };
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
  parseRequestBody: vi.fn(),
}));

import { GET, POST, DELETE, PATCH } from "./route";

function makeRequest(method: string, query = "", body?: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const init: RequestInit = { method, headers };
  if (body) init.body = JSON.stringify(body);
  return new Request(`http://localhost:3000/api/teacher/announcements${query}`, init);
}

function setSession(role: string, userId: string) {
  mocks.guardResult = { session: { userId, role } };
}

const mockAnnouncement = {
  id: "ann-1",
  title: "Exam reminder",
  content: "Be ready",
  groupId: "g1",
  createdById: "teacher-1",
  expiresAt: null,
  createdAt: new Date(),
  group: { id: "g1", name: "Group 1" },
  creator: { id: "teacher-1", name: "Teacher", role: "TEACHER" },
};

describe("GET /api/teacher/announcements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.mockAnnouncementFindMany.mockResolvedValue([mockAnnouncement]);
  });

  it("returns announcements for a group", async () => {
    const res = await GET(makeRequest("GET", "?groupId=g1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.announcements).toHaveLength(1);
    expect(mocks.mockAnnouncementFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groupId: "g1" } })
    );
  });

  it("returns own groups + system-wide announcements without groupId", async () => {
    mocks.mockGroupFindMany.mockResolvedValue([{ id: "g1" }]);

    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    expect(mocks.mockGroupFindMany).toHaveBeenCalledWith({
      where: { createdByUserId: "teacher-1" },
      select: { id: true },
    });
    expect(mocks.mockAnnouncementFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ groupId: { in: ["g1"] } }, { groupId: null }] },
      })
    );
  });

  it("returns 403 when unauthorized", async () => {
    mocks.guardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/teacher/announcements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockGroupFindMany.mockResolvedValue([]);
    mocks.mockGroupFindUnique.mockResolvedValue({ createdByUserId: "teacher-1" });
    mocks.mockAnnouncementCreate.mockResolvedValue(mockAnnouncement);
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("creates an announcement for own group", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { title: "Exam reminder", content: "Be ready", groupId: "g1", expiresAt: null },
    });
    mocks.mockGroupFindMany.mockReset();
    mocks.mockGroupFindUnique.mockResolvedValue({ createdByUserId: "teacher-1" });

    const res = await POST(makeRequest("POST", "", { title: "X", content: "Y", groupId: "g1" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.announcement.title).toBe("Exam reminder");
    expect(mocks.mockAnnouncementCreate).toHaveBeenCalledWith({
      data: {
        title: "Exam reminder",
        content: "Be ready",
        groupId: "g1",
        createdById: "teacher-1",
        expiresAt: null,
      },
      include: expect.objectContaining({ group: { select: { id: true, name: true } } }),
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "ANNOUNCEMENT_CREATE" }),
      })
    );
  });

  it("returns 403 when posting to another teacher's group", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { title: "X", content: "Y", groupId: "g2", expiresAt: null },
    });
    mocks.mockGroupFindUnique.mockResolvedValue({ createdByUserId: "teacher-2" });

    const res = await POST(makeRequest("POST", "", { title: "X", content: "Y", groupId: "g2" }));
    expect(res.status).toBe(403);
    expect(mocks.mockAnnouncementCreate).not.toHaveBeenCalled();
  });

  it("allows admin to post to any group", async () => {
    setSession("ADMIN", "admin-1");
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { title: "X", content: "Y", groupId: "g2", expiresAt: null },
    });

    const res = await POST(makeRequest("POST", "", { title: "X", content: "Y", groupId: "g2" }));
    expect(res.status).toBe(201);
    expect(mocks.mockAnnouncementCreate).toHaveBeenCalled();
  });

  it("creates system-wide announcement without groupId", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { title: "System", content: "Note", groupId: null, expiresAt: null },
    });

    const res = await POST(makeRequest("POST", "", { title: "System", content: "Note" }));
    expect(res.status).toBe(201);
    expect(mocks.mockAnnouncementCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ groupId: null }) })
    );
  });
});

describe("PATCH /api/teacher/announcements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockAnnouncementFindUnique.mockResolvedValue({
      createdById: "teacher-1",
      groupId: "g1",
    });
    mocks.mockAnnouncementUpdate.mockResolvedValue({ ...mockAnnouncement, title: "Updated" });
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("updates an announcement", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { id: "ann-1", title: "Updated" },
    });

    const res = await PATCH(makeRequest("PATCH", "", { id: "ann-1", title: "Updated" }));
    expect(res.status).toBe(200);
    expect(mocks.mockAnnouncementUpdate).toHaveBeenCalledWith({
      where: { id: "ann-1" },
      data: { title: "Updated" },
      include: expect.objectContaining({ group: { select: { id: true, name: true } } }),
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "ANNOUNCEMENT_UPDATE" }),
      })
    );
  });

  it("returns 403 when updating another creator's announcement", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { id: "ann-1", title: "Hijack" },
    });
    mocks.mockAnnouncementFindUnique.mockResolvedValue({
      createdById: "teacher-2",
      groupId: "g1",
    });

    const res = await PATCH(makeRequest("PATCH", "", { id: "ann-1", title: "Hijack" }));
    expect(res.status).toBe(403);
    expect(mocks.mockAnnouncementUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when announcement not found", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { id: "missing", title: "X" },
    });
    mocks.mockAnnouncementFindUnique.mockResolvedValue(null);

    const res = await PATCH(makeRequest("PATCH", "", { id: "missing", title: "X" }));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/teacher/announcements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockAnnouncementFindUnique.mockResolvedValue({ createdById: "teacher-1" });
    mocks.mockAnnouncementDelete.mockResolvedValue(mockAnnouncement);
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("deletes own announcement", async () => {
    const res = await DELETE(makeRequest("DELETE", "?id=ann-1"));
    expect(res.status).toBe(200);
    expect(mocks.mockAnnouncementDelete).toHaveBeenCalledWith({ where: { id: "ann-1" } });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "ANNOUNCEMENT_DELETE" }),
      })
    );
  });

  it("returns 400 when id missing", async () => {
    const res = await DELETE(makeRequest("DELETE"));
    expect(res.status).toBe(400);
    expect(mocks.mockAnnouncementDelete).not.toHaveBeenCalled();
  });

  it("returns 403 when deleting another creator's announcement", async () => {
    mocks.mockAnnouncementFindUnique.mockResolvedValue({ createdById: "teacher-2" });
    const res = await DELETE(makeRequest("DELETE", "?id=ann-1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when announcement not found", async () => {
    mocks.mockAnnouncementFindUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE", "?id=missing"));
    expect(res.status).toBe(404);
  });
});
