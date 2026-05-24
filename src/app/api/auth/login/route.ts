import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimits, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { formatZodError } from "@/lib/api-error-handler";

const loginSchema = z.object({
  login: z.string().min(1, "Email или телефон обязательны"),
  password: z.string().min(1, "Пароль обязателен"),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const result = checkRateLimit(`login:${ip}`, rateLimits.login);
  if (result.limited) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await req.json();
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

    if (!user || !user.hashedPassword) {
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

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: "Неверный email/телефон или пароль" },
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
  } catch (error) {
    logger.error("Login error", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Ошибка при входе" },
      { status: 500 }
    );
  }
}
