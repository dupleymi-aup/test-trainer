import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { generateSecureToken } from "@/lib/crypto";
import { checkRateLimit, rateLimits, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const verifyOtpSchema = z.object({
  phone: z.string().min(1, "Телефон обязателен").max(20, "Номер телефона слишком длинный"),
  code: z.string().min(1, "Код обязателен"),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const result = checkRateLimit(`verify-otp:${ip}`, rateLimits.verifyOtp);
  if (result.limited) {
    return createRateLimitResponse(result.resetAt);
  }

  try {
    const body = await req.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Укажите телефон и код", details: parsed.error.message },
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

    // Generate a reset token for the user
    const user = await db.user.findUnique({ where: { phone: phone.trim() } });
    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const resetToken = generateSecureToken();

    // Delete used code and create reset token atomically
    await db.$transaction([
      db.verificationCode.delete({ where: { id: verificationCode.id } }),
      db.verificationToken.create({
        data: {
          identifier: `password-reset:${user.id}`,
          token: resetToken,
          expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        },
      }),
    ]);

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
