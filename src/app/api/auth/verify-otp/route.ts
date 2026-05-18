import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { generateSecureToken } from "@/lib/crypto";
import { checkRateLimit, rateLimits, createRateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const verifyOtpSchema = z.object({
  phone: z.string().min(1, "Телефон обязателен").max(20, "Номер телефона слишком длинный"),
  code: z.string().min(1, "Код обязателен"),
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
  const result = checkRateLimit(`verify-otp:${ip}`, rateLimits.verifyOtp);
  if (result.limited) {
    return createRateLimitResponse(result.resetAt);
  }

  try {
    const body = await req.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Укажите телефон и код", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { phone, code } = parsed.data;

    const verificationCode = await db.verificationCode.findFirst({
      where: {
        phone: phone.trim(),
        code,
        expires: { gt: new Date() },
      },
    });

    if (!verificationCode) {
      return NextResponse.json(
        { error: "Неверный код или срок его действия истёк" },
        { status: 400 }
      );
    }

    // Delete used code
    await db.verificationCode.delete({ where: { id: verificationCode.id } });

    // Generate a reset token for the user
    const user = await db.user.findUnique({ where: { phone: phone.trim() } });
    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const resetToken = generateSecureToken();

    await db.verificationToken.create({
      data: {
        identifier: `password-reset:${user.id}`,
        token: resetToken,
        expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    });

    return NextResponse.json({
      message: "Код подтверждён",
      token: resetToken,
    });
  } catch (error) {
    logger.error("Verify OTP error", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Ошибка при проверке кода" },
      { status: 500 }
    );
  }
}
