import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateSecureToken } from "@/lib/crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Укажите телефон и код" },
        { status: 400 }
      );
    }

    const verificationCode = await db.verificationCode.findFirst({
      where: {
        phone: phone.trim(),
        code,
        expires: { gt: new Date() },
      },
    });

    if (!verificationCode) {
      return NextResponse.json(
        { error: "Неверный код или срок его действия истёк" },
        { status: 400 }
      );
    }

    // Delete used code
    await db.verificationCode.delete({ where: { id: verificationCode.id } });

    // Generate a reset token for the user
    const user = await db.user.findUnique({ where: { phone: phone.trim() } });
    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const resetToken = generateSecureToken();

    await db.verificationToken.create({
      data: {
        identifier: `password-reset:${user.id}`,
        token: resetToken,
        expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    });

    return NextResponse.json({
      message: "Код подтверждён",
      token: resetToken,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Ошибка при проверке кода" },
      { status: 500 }
    );
  }
}
