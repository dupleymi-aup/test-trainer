import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Отсутствует токен" },
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

    // Extract user ID from identifier (format: email-verify:userId)
    const identifierParts = verificationToken.identifier.split(":");
    const userId = identifierParts[identifierParts.length - 1];

    await db.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });

    // Delete used token
    await db.verificationToken.delete({ where: { token } });

    return NextResponse.json({ message: "Email подтверждён" });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { error: "Ошибка при подтверждении email" },
      { status: 500 }
    );
  }
}
