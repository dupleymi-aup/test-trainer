import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Укажите токен и новый пароль" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Пароль должен быть не менее 8 символов" },
        { status: 400 }
      );
    }

    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      return NextResponse.json(
        { error: "Неверный токен или срок его действия истёк" },
        { status: 400 }
      );
    }

    // Extract user ID from identifier (format: password-reset:userId)
    const identifierParts = verificationToken.identifier.split(":");
    const userId = identifierParts[identifierParts.length - 1];

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: { id: userId },
      data: { hashedPassword },
    });

    // Delete used token
    await db.verificationToken.delete({ where: { token } });

    return NextResponse.json({ message: "Пароль успешно изменён" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Ошибка при сбросе пароля" },
      { status: 500 }
    );
  }
}
