import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, generatePasswordResetEmail } from "@/lib/email";
import { sendSMS, generateOTPCode, generatePasswordResetSMS } from "@/lib/sms";
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
  const result = checkRateLimit(`forgot-password:${ip}`, rateLimits.forgotPassword);
  if (result.limited) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await req.json();
    const { email, phone } = body;

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Укажите email или номер телефона" },
        { status: 400 }
      );
    }

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
        console.error("Forgot-password email failed:", emailError);
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
      try {
        await sendSMS({ phone: trimmedPhone, message: smsMessage });
      } catch (smsError) {
        // Delete the OTP code since SMS failed
        await db.verificationCode.deleteMany({
          where: { phone: trimmedPhone, code },
        });
        console.error("SMS send failed:", smsError);
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
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Ошибка при отправке кода восстановления" },
      { status: 500 }
    );
  }
}
