import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendEmail, generatePasswordResetEmail } from "@/lib/email";
import { sendSMS, generateOTPCode, generatePasswordResetSMS } from "@/lib/sms";
import { generateSecureToken } from "@/lib/crypto";
import { checkRateLimit, rateLimits, createRateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const forgotPasswordSchema = z.object({
  email: z.string().email("Неверный формат email").max(255).optional(),
  phone: z.string().max(20, "Номер телефона слишком длинный").optional(),
}).refine(data => data.email || data.phone, {
  message: "Укажите email или номер телефона",
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
  const result = checkRateLimit(`forgot-password:${ip}`, rateLimits.forgotPassword);
  if (result.limited) {
    return createRateLimitResponse(result.resetAt);
  }

  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { email, phone } = parsed.data;

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    if (email) {
      const emailLower = email.toLowerCase().trim();
      const user = await db.user.findUnique({ where: { email: emailLower } });

      // Always return the same response regardless of whether user exists
      // to prevent email/phone enumeration via timing attack
      if (!user) {
        return NextResponse.json({
          message: "Если аккаунт существует, инструкция отправлена на email",
          method: "email",
        });
      }

      const token = generateSecureToken();

      await db.verificationToken.create({
        data: {
          identifier: `password-reset:${user.id}`,
          token,
          expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      const emailData = generatePasswordResetEmail(token, baseUrl);
      try {
        await sendEmail({ to: emailLower, ...emailData });
      } catch (emailError) {
        // Delete the token since email failed
        await db.verificationToken.deleteMany({
          where: { identifier: `password-reset:${user.id}`, token },
        });
        logger.error("Forgot-password email failed", emailError instanceof Error ? emailError : undefined);
        return NextResponse.json(
          { error: "Не удалось отправить письмо. Попробуйте позже или используйте телефон" },
          { status: 503 }
        );
      }

      return NextResponse.json({
        message: "Если аккаунт существует, инструкция отправлена на email",
        method: "email",
      });
    }

    if (phone) {
      const trimmedPhone = phone.trim();
      const user = await db.user.findUnique({ where: { phone: trimmedPhone } });

      // Always return the same response regardless of whether user exists
      if (!user) {
        return NextResponse.json({
          message: "Если аккаунт существует, код отправлен по SMS",
          method: "phone",
        });
      }

      const code = generateOTPCode();

      await db.verificationCode.create({
        data: {
          code,
          phone: trimmedPhone,
          expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      });

      const smsMessage = generatePasswordResetSMS(code);
      const smsResult = await sendSMS({ phone: trimmedPhone, message: smsMessage });
      if (!smsResult.success) {
        // Delete the OTP code since SMS failed
        await db.verificationCode.deleteMany({
          where: { phone: trimmedPhone, code },
        });
        logger.error("SMS send failed", { error: smsResult.error });
        return NextResponse.json(
          { error: "Не удалось отправить SMS. Попробуйте позже или используйте email" },
          { status: 503 }
        );
      }

      return NextResponse.json({
        message: "Если аккаунт существует, код отправлен по SMS",
        method: "phone",
      });
    }

    return NextResponse.json(
      { error: "Укажите email или номер телефона" },
      { status: 400 }
    );
  } catch (error) {
    logger.error("Forgot password error", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Ошибка при отправке кода восстановления" },
      { status: 500 }
    );
  }
}
