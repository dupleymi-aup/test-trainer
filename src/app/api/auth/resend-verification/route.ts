import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { sendEmail, generateVerificationEmail } from "@/lib/email";
import { generateSecureToken } from "@/lib/crypto";
import { DEFAULT_APP_URL } from "@/lib/constants";
import { checkRateLimit, rateLimits, createRateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if ("response" in auth) return auth.response;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const result = checkRateLimit(`resend:${auth.session.userId}`, rateLimits.resendVerification);
    if (result.limited) {
      return createRateLimitResponse(result.resetAt);
    }

    const user = await db.user.findUnique({
      where: { id: auth.session.userId },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user || !user.email) {
      return NextResponse.json(
        { error: "Email не указан" },
        { status: 400 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email уже подтверждён" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || DEFAULT_APP_URL;
    const verificationToken = generateSecureToken();

    // Delete old token if exists
    await db.verificationToken.deleteMany({
      where: { identifier: `email-verify:${user.id}` },
    });

    await db.verificationToken.create({
      data: {
        identifier: `email-verify:${user.id}`,
        token: verificationToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const emailData = generateVerificationEmail(verificationToken, baseUrl);
    try {
      await sendEmail({ to: user.email, ...emailData });
      return NextResponse.json({ message: "Письмо отправлено" });
    } catch (emailError) {
      await db.verificationToken.delete({ where: { token: verificationToken } });
      logger.error("Resend verification email failed", emailError instanceof Error ? emailError : undefined);
      return NextResponse.json(
        { error: "Не удалось отправить письмо. Попробуйте позже" },
        { status: 503 }
      );
    }
  } catch (error) {
    logger.error("Resend verification error", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Ошибка при отправке письма" },
      { status: 500 }
    );
  }
}
