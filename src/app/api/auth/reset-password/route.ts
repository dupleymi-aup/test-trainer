import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkRateLimit, rateLimits, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { AppError, parseRequestBody, withErrorHandler } from "@/lib/api-error-handler";
import { passwordSchema } from "@/lib/shared-schemas";

const resetPasswordSchema = z.object({
  token: z.string().optional(),
  newPassword: passwordSchema,
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const ip = getClientIp(req);
    const result = checkRateLimit(`reset-password:${ip}`, rateLimits.resetPassword);
    if (result.limited) {
      return createRateLimitResponse(result.resetAt);
    }

    const body = await parseRequestBody(req, resetPasswordSchema);
    if (!body.success) return body.errorResponse;

    const { newPassword } = body.data;
    let token = body.data.token;
    // Fall back to httpOnly cookie if token not in body
    if (!token) {
      try {
        token = (await cookies()).get("reset_token")?.value;
      } catch {
        // cookies() unavailable (e.g. test environment)
      }
    }
    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Use transaction to atomically validate, delete token, and update password
    // This prevents race conditions where concurrent requests could both validate
    // the token before either deletes it
    await db.$transaction(async (tx) => {
      const verificationToken = await tx.verificationToken.findUnique({
        where: { token },
      });

      if (!verificationToken || verificationToken.expires < new Date()) {
        throw new AppError(400, "Invalid or expired token");
      }

      // Ensure this is actually a password-reset token, not another token type
      if (!verificationToken.identifier.startsWith("password-reset:")) {
        throw new AppError(400, "Invalid token type");
      }

      // Extract user ID from identifier (format: password-reset:userId)
      const identifierParts = verificationToken.identifier.split(":");
      const userId = identifierParts[identifierParts.length - 1];

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await tx.user.update({
        where: { id: userId },
        data: { hashedPassword, lastSessionInvalidation: new Date() },
      });

      await tx.verificationToken.delete({ where: { token } });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  });
}
