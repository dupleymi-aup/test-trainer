import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { parseRequestBody, withErrorHandler } from "@/lib/api-error-handler";

const loginSchema = z.object({
  login: z.string().min(1, "Email or phone is required").max(255, "Email or phone is too long"),
  password: z.string().min(1, "Password is required").max(128, "Password is too long"),
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const ip = getClientIp(req);
    const ipResult = checkRateLimit(`login:${ip}`, rateLimits.login);
    if (ipResult.limited) {
      return createRateLimitResponse(ipResult.resetAt);
    }

    // Account-level rate limiting (by email/phone) is handled via
    // isLoginRateLimited in NextAuth authorize — both layers work together.

    const bodyResult = await parseRequestBody(req, loginSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { login: loginInput, password } = bodyResult.data;

    const trimmedLogin = loginInput.trim();
    const isPhone = /^\+?\d{10,15}$/.test(trimmedLogin.replace(/[\s()-]/g, ""));

    const user = await db.user.findFirst({
      where: isPhone ? { phone: trimmedLogin } : { email: trimmedLogin.toLowerCase() },
    });

    // Always run bcrypt.compare to prevent timing-based user enumeration.
    // When user doesn't exist, compare against a dummy hash so the timing
    // is indistinguishable from a real password check (~300ms at cost=12).
    const DUMMY_HASH = "$2a$12$eIAqft.XXQMVWE3wR7K0Gu1vN3FzM4LP7RkKx0M5GjH0tN0yqF0W6";
    const hashToCompare = user?.hashedPassword ?? DUMMY_HASH;

    const isValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !user.hashedPassword || !isValid || !user.isActive || user.deletedAt) {
      return NextResponse.json(
        { error: "Invalid email/phone or password" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    );
  });
}
