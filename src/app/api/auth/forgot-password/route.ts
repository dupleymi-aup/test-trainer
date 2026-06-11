import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendEmail, generatePasswordResetEmail } from "@/lib/email";
import { sendSMS, generateOTPCode, generatePasswordResetSMS } from "@/lib/sms";
import { generateSecureToken } from "@/lib/crypto";
import { DEFAULT_APP_URL } from "@/lib/constants";
import { checkRateLimit, rateLimits, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { formatZodError } from "@/lib/api-error-handler";
import { logger } from "@/lib/logger";

const forgotPasswordSchema = z.object({
  email: z.string().email("Неверный формат email").max(255).optional(),
  phone: z.string().max(20, "Номер телефона слишком длинный").optional(),
}).refine(data => data.email || data.phone, {
  message: "Укажите email или номер телефона",
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const result = checkRateLimit(`forgot-password:${ip}`, rateLimits.forgotPassword);
  if (result.limited) {
    return createRateLimitResponse(result.resetAt);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { email, phone } = parsed.data;

    const baseUrl = process.env.NEXTAUTH_URL || DEFAULT_APP_URL;

    if (email) {
      const emailLower = email.toLowerCase().trim();
      const user = await db.user.findUnique({ where: { email: emailLower } });

      // Always perform the same work (token gen + DB write) regardless of
      // whether the user exists, preventing timing-based email enumeration.
      const token = generateSecureToken();

      if (user) {
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
          await db.verificationToken.deleteMany({
            where: { identifier: `password-reset:${user.id}`, token },
          });
          logger.error("Forgot-password email failed", emailError instanceof Error ? emailError : undefined);
          return NextResponse.json(
            { error: "Не удалось отправить письмо. Попробуйте позже или используйте телефон" },
            { status: 503 }
          );
        }
      } else {
        // Store a dummy token so the DB write still happens, matching the
        // timing of the real-user path. Use a unique identifier to avoid
        // collisions with real tokens.
        await db.verificationToken.create({
          data: {
            identifier: `password-reset:dummy-${Date.now()}-${token}`,
            token,
            expires: new Date(Date.now() + 60 * 60 * 1000),
          },
        });
      }

      return NextResponse.json({
        message: "Если аккаунт существует, инструкция отправлена на email",
        method: "email",
      });
    }

    if (phone) {
      const trimmedPhone = phone.trim();
      const user = await db.user.findUnique({ where: { phone: trimmedPhone } });

      // Always perform the same work (OTP gen + DB write) regardless of
      // whether the user exists, preventing timing-based phone enumeration.
      const code = generateOTPCode();

      if (user) {
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
          await db.verificationCode.deleteMany({
            where: { phone: trimmedPhone, code },
          });
          logger.error("SMS send failed", { error: smsResult.error });
          return NextResponse.json(
            { error: "Не удалось отправить SMS. Попробуйте позже или используйте email" },
            { status: 503 }
          );
        }
      } else {
        // Store a dummy OTP so the DB write still happens, matching the
        // timing of the real-user path. Use a unique phone suffix.
        await db.verificationCode.create({
          data: {
            code,
            phone: `dummy-${Date.now()}-${trimmedPhone}`,
            expires: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
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
