import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendEmail, generatePasswordResetEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { generateSecureOTP, generateSecureToken } from "@/lib/crypto";
import { DEFAULT_APP_URL } from "@/lib/constants";
import { checkRateLimit, rateLimits, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { formatZodError, withErrorHandler } from "@/lib/api-error-handler";
import { logger } from "@/lib/logger";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format").max(255).optional(),
  phone: z.string().max(20, "Phone number is too long").optional(),
}).refine(data => data.email || data.phone, {
  message: "Email or phone is required",
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const ip = getClientIp(req);
    const result = checkRateLimit(`forgot-password:${ip}`, rateLimits.forgotPassword);
    if (result.limited) {
      return createRateLimitResponse(result.resetAt);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: formatZodError(parsed.error) },
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
            { error: "Failed to send email. Please try later" },
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
        message: "If account exists, instructions sent to email",
        method: "email",
      });
    }

    if (phone) {
      const trimmedPhone = phone.trim();
      const user = await db.user.findUnique({ where: { phone: trimmedPhone } });

      // Always perform the same work (OTP gen + DB write) regardless of
      // whether the user exists, preventing timing-based phone enumeration.
      const code = generateSecureOTP();

      if (user) {
        await db.verificationCode.create({
          data: {
            code,
            phone: trimmedPhone,
            expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          },
        });

        const smsMessage = `Ваш код для восстановления пароля: ${code}. Действует 15 минут. Тренажёр тестирования.`;
        const smsResult = await sendSMS({ phone: trimmedPhone, message: smsMessage });
        if (!smsResult.success) {
          await db.verificationCode.deleteMany({
            where: { phone: trimmedPhone, code },
          });
          logger.error("SMS send failed", { error: smsResult.error });
          return NextResponse.json(
            { error: "Failed to send SMS. Please try later" },
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
        message: "If account exists, code sent via SMS",
        method: "phone",
      });
    }

    return NextResponse.json(
      { error: "Provide email or phone number" },
      { status: 400 }
    );
  });
}
