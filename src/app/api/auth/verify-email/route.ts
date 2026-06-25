import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { formatZodError, withErrorHandler } from "@/lib/api-error-handler";
import { checkRateLimit, createRateLimitResponse, getClientIp, rateLimits } from "@/lib/rate-limit";

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const ip = getClientIp(req);
    const rl = checkRateLimit("verifyEmail:" + ip, rateLimits.verifyEmail);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = verifyEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Token is required", details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

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
