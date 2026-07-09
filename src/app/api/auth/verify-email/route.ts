import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseRequestBody, withErrorHandler } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, getClientIp, rateLimits } from "@/lib/rate-limit";

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const ip = getClientIp(req);
    const rl = checkRateLimit("verifyEmail:" + ip, rateLimits.verifyEmail);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);

    const body = await parseRequestBody(req, verifyEmailSchema);
    if (!body.success) return body.errorResponse;

    const { token } = body.data;

    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Ensure this is actually an email-verify token, not another token type
    if (!verificationToken.identifier.startsWith("email-verify:")) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Extract user ID from identifier (format: email-verify:userId)
    const identifierParts = verificationToken.identifier.split(":");
    const userId = identifierParts[identifierParts.length - 1];

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 }
      );
    }

    // Verify user exists before updating
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email already verified" },
        { status: 400 }
      );
    }

    // Perform both operations in a transaction to prevent race conditions
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { emailVerified: new Date() },
      }),
      db.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.json({ message: "Email verified" }, { status: 200 });
  });
}
