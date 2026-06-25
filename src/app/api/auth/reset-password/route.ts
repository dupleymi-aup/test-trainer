import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkRateLimit, rateLimits, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { formatZodError, withErrorHandler } from "@/lib/api-error-handler";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const ip = getClientIp(req);
    const result = checkRateLimit(`reset-password:${ip}`, rateLimits.resetPassword);
    if (result.limited) {
      return createRateLimitResponse(result.resetAt);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { token, newPassword } = parsed.data;

    // Use transaction to atomically validate, delete token, and update password
    // This prevents race conditions where concurrent requests could both validate
    // the token before either deletes it
    await db.$transaction(async (tx) => {
      const verificationToken = await tx.verificationToken.findUnique({
        where: { token },
      });

      if (!verificationToken || verificationToken.expires < new Date()) {
        throw new Error("invalid_or_expired_token");
      }

      // Ensure this is actually a password-reset token, not another token type
      if (!verificationToken.identifier.startsWith("password-reset:")) {
        throw new Error("invalid_token_type");
      }

      // Extract user ID from identifier (format: password-reset:userId)
      const identifierParts = verificationToken.identifier.split(":");
      const userId = identifierParts[identifierParts.length - 1];

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await tx.user.update({
        where: { id: userId },
        data: { hashedPassword },
      });

      await tx.verificationToken.delete({ where: { token } });
    });

    return NextResponse.json({ message: "Password changed successfully" }, { status: 200 });
  });
}
