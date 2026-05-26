import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth } from "@/lib/admin-guard";
import { checkRateLimit, rateLimits, createRateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { formatZodError } from "@/lib/api-error-handler";

const profileUpdateSchema = z.object({
  name: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  university: z.string().max(200).optional().nullable(),
  group: z.string().max(100).optional().nullable(),
  avatar: z.string().url().max(500).optional().nullable(),
});

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("response" in auth) return auth.response;

    const user = await db.user.findUnique({
      where: { id: auth.session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        phone: true,
        role: true,
        avatar: true,
        bio: true,
        university: true,
        group: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    logger.error("Get profile error", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Ошибка при получении профиля" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth();
    if ("response" in auth) return auth.response;

    // Rate limit profile updates
    const rateResult = checkRateLimit(`profile:${auth.session.userId}`, rateLimits.profileUpdate);
    if (rateResult.limited) {
      return createRateLimitResponse(rateResult.resetAt);
    }

    const body = await req.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { name, phone, bio, university, group, avatar } = parsed.data;

    const updateData: Record<string, string | null> = {};
    if (name !== undefined) updateData.name = name?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (bio !== undefined) updateData.bio = bio?.trim() || null;
    if (university !== undefined) updateData.university = university?.trim() || null;
    if (group !== undefined) updateData.group = group?.trim() || null;
    if (avatar !== undefined) updateData.avatar = avatar?.trim() || null;

    // Check phone uniqueness
    if (phone) {
      const existingPhone = await db.user.findFirst({
        where: { phone: phone.trim(), id: { not: auth.session.userId } },
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: "Этот номер телефона уже используется другим пользователем" },
          { status: 409 }
        );
      }
    }

    const user = await db.user.update({
      where: { id: auth.session.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        bio: true,
        university: true,
        group: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    logger.error("Update profile error", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Ошибка при обновлении профиля" }, { status: 500 });
  }
}
