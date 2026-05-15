import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateSecureToken } from "@/lib/crypto";
import { checkRateLimit, rateLimits } from "@/lib/rate-limit";

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
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await req.json();
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Укажите телефон и код" },
        { status: 400 }
      );
    }

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
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Ошибка при проверке кода" },
      { status: 500 }
    );
  }
}
