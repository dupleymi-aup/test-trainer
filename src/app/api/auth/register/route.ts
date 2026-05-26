import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendEmail, generateVerificationEmail } from "@/lib/email";
import { generateSecureToken } from "@/lib/crypto";
import { checkRateLimit, rateLimits, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { formatZodError } from "@/lib/api-error-handler";

const registerSchema = z.object({
  name: z.string().min(1, "Имя обязательно").max(100, "Имя слишком длинное").optional(),
  email: z.string().email("Неверный формат email").max(255, "Email слишком длинный"),
  phone: z.string().max(20, "Номер телефона слишком длинный").optional().nullable(),
  password: z.string().min(8, "Пароль должен быть не менее 8 символов").max(128, "Пароль слишком длинный"),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const result = checkRateLimit(`register:${ip}`, rateLimits.register);
  if (result.limited) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = parsed.data;

    // New users always default to STUDENT role — TEACHER role can only be granted by admin
    const role = "STUDENT";

    const emailLower = email.toLowerCase().trim();

    const orConditions: Array<{ email?: string; phone?: string }> = [{ email: emailLower }];
    if (phone) orConditions.push({ phone: phone.trim() });

    const existingUser = await db.user.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (existingUser?.email === emailLower) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    if (phone && existingUser?.phone === phone.trim()) {
      return NextResponse.json(
        { error: "Пользователь с таким номером телефона уже существует" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name: name?.trim() || null,
        email: emailLower,
        phone: phone?.trim() || null,
        hashedPassword,
        role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    // Send verification email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verificationToken = generateSecureToken();

    await db.verificationToken.create({
      data: {
        identifier: `email-verify:${user.id}`,
        token: verificationToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const emailData = generateVerificationEmail(verificationToken, baseUrl);
    try {
      await sendEmail({ to: emailLower, ...emailData });
      return NextResponse.json(
        { message: "Пользователь создан. Проверьте email для подтверждения.", user },
        { status: 201 }
      );
    } catch (emailError) {
      // User is created but verification email failed
      logger.error("Registration email failed", emailError instanceof Error ? emailError : undefined);
      return NextResponse.json(
        { message: "Пользователь создан. Обратитесь к преподавателю для подтверждения email.", user },
        { status: 201 }
      );
    }
  } catch (error) {
    logger.error("Registration error", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Ошибка при регистрации" },
      { status: 500 }
    );
  }
}
