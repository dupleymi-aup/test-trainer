import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { sendEmail, generateVerificationEmail } from "@/lib/email";
import { generateSecureToken } from "@/lib/crypto";
import { DEFAULT_APP_URL } from "@/lib/constants";
import { checkRateLimit, rateLimits, createRateLimitResponse } from "@/lib/rate-limit";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireAuth());
    unwrapGuard(await requireCSRF(req));

    const result = checkRateLimit(`resend:${session.userId}`, rateLimits.resendVerification);
    if (result.limited) {
      return createRateLimitResponse(result.resetAt);
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user || !user.email) {
      return NextResponse.json(
        { error: "Email not provided" },
        { status: 400 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email already verified" },
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
      return NextResponse.json({ success: true });
    } catch (emailErr: unknown) {
      logger.warn("Failed to send verification email", { userId: session.userId, error: emailErr instanceof Error ? emailErr.message : String(emailErr) });
      await db.verificationToken.delete({ where: { token: verificationToken } });
      return NextResponse.json(
        { error: "Failed to send email. Please try later" },
        { status: 503 }
      );
    }
  });
}
