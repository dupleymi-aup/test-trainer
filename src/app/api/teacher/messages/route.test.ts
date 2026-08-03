import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    mockMessageFindMany: vi.fn(),
    mockMessageCount: vi.fn(),
    mockMessageCreate: vi.fn(),
    mockMessageUpdateMany: vi.fn(),
    mockMessageFindUnique: vi.fn(),
    mockMessageDelete: vi.fn(),
    mockMessageDeleteMany: vi.fn(),
    mockUserGroupFindFirst: vi.fn(),
    mockActivityLogCreate: vi.fn(),
    mockGetTeacherGroupIds: vi.fn(),
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
    message: {
      findMany: mocks.mockMessageFindMany,
      count: mocks.mockMessageCount,
      create: mocks.mockMessageCreate,
      updateMany: mocks.mockMessageUpdateMany,
      findUnique: mocks.mockMessageFindUnique,
      delete: mocks.mockMessageDelete,
      deleteMany: mocks.mockMessageDeleteMany,
    },
    userGroup: { findFirst: mocks.mockUserGroupFindFirst },
    activityLog: { create: mocks.mockActivityLogCreate },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.mockCheckRateLimit,
  createRateLimitResponse: mocks.mockCreateRateLimitResponse,
  getClientIp: mocks.mockGetClientIp,
  rateLimits: { teacherMessageSend: { max: 30, windowMs: 60000 } },
}));

vi.mock("@/lib/admin-guard", () => {
  const m = mocks;
  return {
    requireTeacherOrAdmin: vi.fn().mockImplementation(async () => {
      if (m.guardResult) return m.guardResult;
      return { session: { userId: "teacher-1", role: "TEACHER" } };
    }),
    getTeacherGroupIds: m.mockGetTeacherGroupIds,
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

import { GET, POST, PATCH, DELETE } from "./route";

function makeRequest(method: string, query = "", body?: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const init: RequestInit = { method, headers };
  if (body) init.body = JSON.stringify(body);
  return new Request(`http://localhost:3000/api/teacher/messages${query}`, init);
}

function setSession(role: string, userId: string) {
  mocks.guardResult = { session: { userId, role } };
}

const mockMessage = {
  id: "m1",
  fromUserId: "teacher-1",
  toUserId: "u1",
  subject: "Hi",
  content: "Hello",
  read: false,
  readAt: null,
  createdAt: new Date(),
  fromUser: { id: "teacher-1", name: "Teacher", email: "t@t.com", role: "TEACHER" },
  toUser: { id: "u1", name: "Alice", email: "a@t.com", role: "STUDENT" },
};

describe("GET /api/teacher/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.mockMessageFindMany.mockResolvedValue([mockMessage]);
    mocks.mockMessageCount.mockResolvedValue(1);
  });

  it("returns inbox with pagination", async () => {
    const res = await GET(makeRequest("GET", "?page=2&limit=10"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(1);
    expect(body.page).toBe(2);
    expect(body.limit).toBe(10);
    expect(body.unreadCount).toBe(1);
    expect(mocks.mockMessageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { toUserId: "teacher-1" },
        skip: 10,
        take: 10,
      })
    );
  });

  it("returns sent folder without unread count", async () => {
    const res = await GET(makeRequest("GET", "?folder=sent"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(mocks.mockMessageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { fromUserId: "teacher-1" } })
    );
    expect(body.unreadCount).toBe(0);
  });

  it("clamps limit to 100 and invalid page to 1", async () => {
    const res = await GET(makeRequest("GET", "?limit=9999&page=abc"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.limit).toBe(100);
    expect(body.page).toBe(1);
  });

  it("returns 403 when unauthorized", async () => {
    mocks.guardResult = { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/teacher/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockGetTeacherGroupIds.mockResolvedValue(["g1"]);
    mocks.mockUserGroupFindFirst.mockResolvedValue({ userId: "u1", groupId: "g1" });
    mocks.mockMessageCreate.mockResolvedValue(mockMessage);
    mocks.mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("sends a message to a student in own group", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { toUserId: "u1", subject: "Hi", content: "Hello", replyToId: undefined },
    });

    const res = await POST(makeRequest("POST", "", { toUserId: "u1", subject: "Hi", content: "Hello" }));
    expect(res.status).toBe(201);
    expect(mocks.mockMessageCreate).toHaveBeenCalledWith({
      data: {
        fromUserId: "teacher-1",
        toUserId: "u1",
        subject: "Hi",
        content: "Hello",
        replyToId: null,
      },
      include: expect.objectContaining({ fromUser: { select: { id: true, name: true, role: true } } }),
    });
    expect(mocks.mockActivityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "MESSAGE_SEND" }),
      })
    );
  });

  it("returns 403 when recipient not in teacher's groups", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { toUserId: "other", subject: "Hi", content: "Hello" },
    });
    mocks.mockUserGroupFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest("POST", "", { toUserId: "other", subject: "Hi", content: "Hello" }));
    expect(res.status).toBe(403);
    expect(mocks.mockMessageCreate).not.toHaveBeenCalled();
  });

  it("allows admin to message anyone", async () => {
    setSession("ADMIN", "admin-1");
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { toUserId: "u1", subject: "Hi", content: "Hello" },
    });

    const res = await POST(makeRequest("POST", "", { toUserId: "u1", subject: "Hi", content: "Hello" }));
    expect(res.status).toBe(201);
    expect(mocks.mockUserGroupFindFirst).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/teacher/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockMessageUpdateMany.mockResolvedValue({ count: 2 });
  });

  it("marks own messages as read", async () => {
    const { parseRequestBody } = await import("@/lib/api-error-handler");
    vi.mocked(parseRequestBody).mockResolvedValue({
      success: true,
      data: { messageIds: ["m1", "m2"] },
    });

    const res = await PATCH(makeRequest("PATCH", "", { messageIds: ["m1", "m2"] }));
    expect(res.status).toBe(200);
    expect(mocks.mockMessageUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["m1", "m2"] }, toUserId: "teacher-1" },
      data: { read: true, readAt: expect.any(Date) },
    });
  });
});

describe("DELETE /api/teacher/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("TEACHER", "teacher-1");
    mocks.csrfResult = { verified: true };
    mocks.mockCheckRateLimit.mockReturnValue({ limited: false, resetAt: 0 });
    mocks.mockGetClientIp.mockReturnValue("127.0.0.1");
    mocks.mockMessageFindUnique.mockResolvedValue({
      fromUserId: "teacher-1",
      toUserId: "u1",
    });
    mocks.mockMessageDelete.mockResolvedValue(mockMessage);
    mocks.mockMessageDeleteMany.mockResolvedValue({ count: 2 });
  });

  it("deletes a single message", async () => {
    const res = await DELETE(makeRequest("DELETE", "?id=m1"));
    expect(res.status).toBe(200);
    expect(mocks.mockMessageDelete).toHaveBeenCalledWith({ where: { id: "m1" } });
  });

  it("returns 403 when deleting a message not involving the teacher", async () => {
    mocks.mockMessageFindUnique.mockResolvedValue({
      fromUserId: "teacher-2",
      toUserId: "teacher-3",
    });
    const res = await DELETE(makeRequest("DELETE", "?id=m1"));
    expect(res.status).toBe(403);
    expect(mocks.mockMessageDelete).not.toHaveBeenCalled();
  });

  it("returns 404 when message not found", async () => {
    mocks.mockMessageFindUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE", "?id=m1"));
    expect(res.status).toBe(404);
  });

  it("deletes multiple messages via ids param", async () => {
    const res = await DELETE(makeRequest("DELETE", "?ids=m1,m2"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deletedCount).toBe(2);
    expect(mocks.mockMessageDeleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["m1", "m2"] },
        OR: [{ fromUserId: "teacher-1" }, { toUserId: "teacher-1" }],
      },
    });
  });

  it("returns 400 when id and ids missing", async () => {
    const res = await DELETE(makeRequest("DELETE"));
    expect(res.status).toBe(400);
  });
});
