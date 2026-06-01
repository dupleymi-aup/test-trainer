import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse, getClientIp, rateLimits } from "@/lib/rate-limit";
import { formatZodError } from "@/lib/api-error-handler";
import { parsePositiveInt } from "@/lib/validate";

const RoleSchema = z.nativeEnum(Role);

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

  const { searchParams } = new URL(req.url);
  const rawRole = searchParams.get("role");
  const role = rawRole && rawRole !== "ALL" ? RoleSchema.safeParse(rawRole) : undefined;
  const search = searchParams.get("search");
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const limit = Math.min(200, parsePositiveInt(searchParams.get("limit"), 20));
  const showDeleted = searchParams.get("showDeleted") === "true";
  const allowedSortBy = ["createdAt", "name", "attempts"] as const;
  const rawSortBy = searchParams.get("sortBy") || "createdAt";
  const sortBy: (typeof allowedSortBy)[number] = allowedSortBy.includes(rawSortBy as (typeof allowedSortBy)[number])
    ? (rawSortBy as (typeof allowedSortBy)[number])
    : "createdAt";
  const sortDir: "asc" | "desc" = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (!showDeleted) {
    where.deletedAt = null;
  }

  if (role?.success) {
    where.role = role.data;
  } else if (rawRole && rawRole !== "ALL" && !role?.success) {
    return NextResponse.json({ error: `Invalid role: ${rawRole}` }, { status: 400 });
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  // Build sort order
  const orderBy: Prisma.UserOrderByWithRelationInput = {};
  if (sortBy === "attempts") {
    orderBy.attempts = { _count: sortDir };
  } else if (sortBy === "name") {
    orderBy.name = { sort: sortDir, nulls: "last" };
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
  name: z.string().min(1, "Имя обязательно").max(100, "Имя слишком длинное").optional(),
  email: z.string().email("Неверный формат email").max(255, "Email слишком длинный").optional().nullable(),
  phone: z.string().max(20, "Номер телефона слишком длинный").optional().nullable(),
  password: z.string().min(8, "Пароль должен быть не менее 8 символов").max(128, "Пароль слишком длинный"),
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"]),
  university: z.string().max(200, "Название университета слишком длинное").optional().nullable(),
  group: z.string().max(100, "Название группы слишком длинное").optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
    const { session } = guard;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`adminUserCrud:${ip}`, rateLimits.adminUserCrud);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: formatZodError(parsed.error) }, { status: 400 });
    }

    const { name, email, phone, password, role, university, group } = parsed.data;

    // Check for existing user — build OR conditions safely
    const orConditions: Array<{ email?: string; phone?: string }> = [];
    if (email) orConditions.push({ email: email.toLowerCase().trim() });
    if (phone) orConditions.push({ phone: phone.trim() });

    const existing = orConditions.length > 0
      ? await db.user.findFirst({ where: { OR: orConditions } })
      : null;

    if (email && existing?.email === email.toLowerCase().trim()) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }
    if (phone && existing?.phone === phone.trim()) {
      return NextResponse.json({ error: "User with this phone already exists" }, { status: 409 });
    }

    const { hash } = await import("bcryptjs");
    const hashedPassword = await hash(password, 12);

    let user;
    try {
      user = await db.user.create({
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
    } catch (createError) {
      if (
        createError instanceof Error &&
        createError.message.includes("P2002")
      ) {
        return NextResponse.json({ error: "User with this email or phone already exists" }, { status: 409 });
      }
      throw createError;
    }

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
