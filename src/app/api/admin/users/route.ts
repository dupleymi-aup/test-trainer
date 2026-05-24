import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse, rateLimits } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/rate-limit";
import { formatZodError } from "@/lib/api-error-handler";

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const showDeleted = searchParams.get("showDeleted") === "true";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc";
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (!showDeleted) {
    where.deletedAt = null; // Exclude soft-deleted users by default
  }

  if (role && role !== "ALL") {
    where.role = role;
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  // Build sort order
  const orderBy: Record<string, unknown> = {};
  if (sortBy === "attempts") {
    orderBy.attempts = { _count: sortDir };
  } else if (sortBy === "name") {
    // Note: nulls: "last" is SQL-specific; MongoDB sorts nulls first by default
    orderBy.name = { sort: sortDir };
  } else {
    orderBy.createdAt = sortDir;
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        avatar: true,
        university: true,
        group: true,
        createdAt: true,
        _count: {
          select: {
            attempts: true,
            groups: true,
          },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
  } catch (error) {
    logger.error("Failed to fetch users", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

const createUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  password: z.string().min(8),
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"]),
  university: z.string().optional().nullable(),
  group: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`adminUserCrud:${ip}`, rateLimits.adminUserCrud);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: formatZodError(parsed.error) }, { status: 400 });
    }

    const { name, email, phone, password, role, university, group } = parsed.data;

    // Check for existing user
    const existing = await db.user.findFirst({
      where: {
        OR: [
          email ? { email: email.toLowerCase() } : {},
          phone ? { phone } : {},
        ].filter((w) => Object.keys(w).length > 0),
      },
    });

    if (existing) {
      return NextResponse.json({ error: "User with this email or phone already exists" }, { status: 409 });
    }

    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.default.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email: email?.toLowerCase() ?? null,
        phone,
        hashedPassword,
        role,
        university,
        group,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "USER_CREATE",
        entity: "User",
        entityId: user.id,
        details: JSON.stringify({ email, role }),
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create user", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
