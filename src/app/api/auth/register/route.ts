import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendEmail, generateVerificationEmail } from "@/lib/email";
import { generateSecureToken } from "@/lib/crypto";
import { checkRateLimit, rateLimits } from "@/lib/rate-limit";

function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: Request) {
  const ip = getClientIP(req);
  const result = checkRateLimit(`register:${ip}`, rateLimits.register);
  if (result.limited) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await req.json();
    const { name, email, phone, password, role } = body;

    // Input length limits to prevent DoS
    if (name && name.length > 100) return NextResponse.json({ error: "Имя слишком длинное" }, { status: 400 });
    if (email.length > 255) return NextResponse.json({ error: "Email слишком длинный" }, { status: 400 });
    if (phone && phone.length > 20) return NextResponse.json({ error: "Номер телефона слишком длинный" }, { status: 400 });
    if (password.length > 128) return NextResponse.json({ error: "Пароль слишком длинный (макс. 128)" }, { status: 400 });

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email и пароль обязательны" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Пароль должен быть не менее 8 символов" },
        { status: 400 }
      );
    }

    // Validate role: only STUDENT and TEACHER allowed via public registration
    const allowedRoles = ["STUDENT", "TEACHER"];
    const userRole = role || "STUDENT";
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Недопустимая роль. Доступны только: студент, преподаватель" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ email: emailLower }, phone ? { phone: phone.trim() } : {}].filter(Boolean),
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
        role: userRole,
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
      console.error("Registration email failed:", emailError);
      return NextResponse.json(
        { message: "Пользователь создан. Обратитесь к преподавателю для подтверждения email.", user },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Ошибка при регистрации" },
      { status: 500 }
    );
  }
}
