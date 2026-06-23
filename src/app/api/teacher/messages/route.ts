import { NextResponse } from "next/server";
import { requireTeacherOrAdmin, getTeacherGroupIds } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { logApiError } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder") || "inbox"; // inbox | sent
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));

    const where: Record<string, unknown> = folder === "sent"
      ? { fromUserId: session.userId }
      : { toUserId: session.userId };

    const [messages, total] = await Promise.all([
      db.message.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          fromUser: { select: { id: true, name: true, email: true, role: true } },
          toUser: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      db.message.count({ where }),
    ]);

    const unreadCount = folder !== "sent"
      ? await db.message.count({ where: { toUserId: session.userId, read: false } })
      : 0;

    return NextResponse.json({ messages, total, page, limit, unreadCount });
  } catch (error) {
    logApiError("teacher/messages", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

const sendMessageSchema = z.object({
  toUserId: z.string().min(1),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  replyToId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`teacherMessageSend:${ip}`, rateLimits.teacherMessageSend);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
    }

    const { toUserId, subject, content, replyToId } = parsed.data;

    // Verify the recipient is in one of the teacher's groups (unless admin)
    if (session.role !== "ADMIN") {
      const teacherGroups = await getTeacherGroupIds(session.userId, session.role);
      const membership = await db.userGroup.findFirst({
        where: { userId: toUserId, groupId: { in: teacherGroups } },
      });
      if (!membership) {
        return NextResponse.json({ error: "Recipient is not in your groups" }, { status: 403 });
      }
    }

    const message = await db.message.create({
      data: {
        fromUserId: session.userId,
        toUserId,
        subject,
        content,
        replyToId: replyToId || null,
      },
      include: {
        fromUser: { select: { id: true, name: true, role: true } },
        toUser: { select: { id: true, name: true, role: true } },
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "MESSAGE_SEND",
        entity: "Message",
        entityId: message.id,
        details: JSON.stringify({ toUserId, subject }),
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    logApiError("teacher/messages", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

const markReadSchema = z.object({
  messageIds: z.array(z.string()).min(1),
});

export async function PATCH(req: Request) {
  try {
    const auth = await requireTeacherOrAdmin();
    if ("response" in auth) return auth.response;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`teacherMessageSend:${ip}`, rateLimits.teacherMessageSend);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
    }

    await db.message.updateMany({
      where: { id: { in: parsed.data.messageIds }, toUserId: auth.session.userId },
      data: { read: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("teacher/messages", error);
    return NextResponse.json({ error: "Failed to mark messages as read" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const guard = await requireTeacherOrAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`teacherMessageSend:${ip}`, rateLimits.teacherMessageSend);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const message = await db.message.findUnique({ where: { id }, select: { fromUserId: true, toUserId: true } });
      if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
      if (message.fromUserId !== session.userId && message.toUserId !== session.userId && session.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await db.message.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const ids = idsParam.split(",");
      await db.message.deleteMany({
        where: {
          id: { in: ids },
          OR: [{ fromUserId: session.userId }, { toUserId: session.userId }],
        },
      });
      return NextResponse.json({ success: true, deletedCount: ids.length });
    }

    return NextResponse.json({ error: "Missing id or ids parameter" }, { status: 400 });
  } catch (error) {
    logApiError("teacher/messages", error);
    return NextResponse.json({ error: "Failed to delete message(s)" }, { status: 500 });
  }
}
