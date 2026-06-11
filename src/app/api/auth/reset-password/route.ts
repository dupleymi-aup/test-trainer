import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkRateLimit, rateLimits, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { formatZodError } from "@/lib/api-error-handler";
import { logger } from "@/lib/logger";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Токен обязателен"),
  newPassword: z.string().min(8, "Пароль должен быть не менее 8 символов").max(128, "Пароль слишком длинный"),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const result = checkRateLimit(`reset-password:${ip}`, rateLimits.resetPassword);
  if (result.limited) {
    return createRateLimitResponse(result.resetAt);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", details: formatZodError(parsed.error) },
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

    return NextResponse.json({ message: "Пароль успешно изменён" }, { status: 200 });
  } catch (error) {
    // Handle transaction-thrown errors for invalid/expired tokens
    if (error instanceof Error && (error.message === "invalid_or_expired_token" || error.message === "invalid_token_type")) {
      return NextResponse.json(
        { error: "Неверный токен или срок его действия истёк" },
        { status: 400 }
      );
    }
    logger.error("Reset password error", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Ошибка при сбросе пароля" },
      { status: 500 }
    );
  }
}
