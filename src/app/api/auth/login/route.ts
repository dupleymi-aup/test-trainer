import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { formatZodError } from "@/lib/api-error-handler";

const loginSchema = z.object({
  login: z.string().min(1, "Email или телефон обязательны").max(255, "Email или телефон слишком длинные"),
  password: z.string().min(1, "Пароль обязателен").max(128, "Пароль слишком длинный"),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const ipResult = checkRateLimit(`login:${ip}`, rateLimits.login);
  if (ipResult.limited) {
    return createRateLimitResponse(ipResult.resetAt);
  }

  // Account-level rate limiting (by email/phone) is handled via
  // isLoginRateLimited in NextAuth authorize — both layers work together.

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { login: loginInput, password } = parsed.data;

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

    if (!user || !user.hashedPassword || !isValid) {
      return NextResponse.json(
        { error: "Неверный email/телефон или пароль" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Аккаунт неактивен" },
        { status: 403 }
      );
    }

    if (user.deletedAt) {
      return NextResponse.json(
        { error: "Аккаунт удалён" },
        { status: 403 }
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
  } catch (error) {
    logger.error("Login error", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Ошибка при входе" },
      { status: 500 }
    );
  }
}
