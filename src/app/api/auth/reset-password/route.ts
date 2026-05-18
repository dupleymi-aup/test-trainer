import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkRateLimit, rateLimits, createRateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Токен обязателен"),
  newPassword: z.string().min(8, "Пароль должен быть не менее 8 символов").max(128, "Пароль слишком длинный"),
});

function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: Request) {
  const ip = getClientIP(req);
  const result = checkRateLimit(`reset-password:${ip}`, rateLimits.resetPassword);
  if (result.limited) {
    return createRateLimitResponse(result.resetAt);
  }

  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { token, newPassword } = parsed.data;

    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      return NextResponse.json(
        { error: "Неверный токен или срок его действия истёк" },
        { status: 400 }
      );
    }

    // Extract user ID from identifier (format: password-reset:userId)
    const identifierParts = verificationToken.identifier.split(":");
    const userId = identifierParts[identifierParts.length - 1];

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: { id: userId },
      data: { hashedPassword },
    });

    // Delete used token
    await db.verificationToken.delete({ where: { token } });

    return NextResponse.json({ message: "Пароль успешно изменён" });
  } catch (error) {
    logger.error("Reset password error", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Ошибка при сбросе пароля" },
      { status: 500 }
    );
  }
}
