import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { checkRateLimit, rateLimits, createRateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { formatZodError } from "@/lib/api-error-handler";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Текущий пароль обязателен"),
  newPassword: z.string().min(8, "Новый пароль должен быть не менее 8 символов").max(128, "Пароль слишком длинный"),
});

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if ("response" in auth) return auth.response;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const result = checkRateLimit(`change-pw:${auth.session.userId}`, rateLimits.changePassword);
    if (result.limited) {
      return createRateLimitResponse(result.resetAt);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await db.user.findUnique({
      where: { id: auth.session.userId },
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: "Невозможно изменить пароль" },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: "Неверный текущий пароль" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: { id: auth.session.userId },
      data: { hashedPassword },
    });

    return NextResponse.json({ message: "Пароль успешно изменён" }, { status: 200 });
  } catch (error) {
    logger.error("Change password error", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Ошибка при смене пароля" }, { status: 500 });
  }
}
