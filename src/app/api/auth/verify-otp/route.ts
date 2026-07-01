import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { generateSecureToken } from "@/lib/crypto";
import { checkRateLimit, rateLimits, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { parseRequestBody, withErrorHandler } from "@/lib/api-error-handler";

const verifyOtpSchema = z.object({
  phone: z.string().min(1, "Phone is required").max(20, "Phone number is too long"),
  code: z.string().min(1, "Code is required"),
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const ip = getClientIp(req);
    const result = checkRateLimit(`verify-otp:${ip}`, rateLimits.verifyOtp);
    if (result.limited) {
      return createRateLimitResponse(result.resetAt);
    }

    const body = await parseRequestBody(req, verifyOtpSchema);
    if (!body.success) return body.errorResponse;

    const { phone, code } = body.data;

    const verificationCode = await db.verificationCode.findFirst({
      where: {
        phone: phone.trim(),
        code,
        expires: { gt: new Date() },
      },
    });

    if (!verificationCode) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 400 }
      );
    }

    // Generate a reset token for the user
    const user = await db.user.findUnique({ where: { phone: phone.trim() } });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const resetToken = generateSecureToken();

    // Delete used code and create reset token atomically
    await db.$transaction([
      db.verificationCode.delete({ where: { id: verificationCode.id } }),
      db.verificationToken.create({
        data: {
          identifier: `password-reset:${user.id}`,
          token: resetToken,
          expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        },
      }),
    ]);

    const response = NextResponse.json({
      message: "Code verified",
    });
    response.cookies.set("reset_token", resetToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/reset-password",
      maxAge: 30 * 60, // 30 minutes
    });
    return response;
  });
}
