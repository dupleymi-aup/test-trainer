import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { formatZodError } from "@/lib/api-error-handler";

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Токен обязателен"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = verifyEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Отсутствует токен", details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      return NextResponse.json(
        { error: "Неверный токен или срок его действия истёк" },
        { status: 400 }
      );
    }

    // Ensure this is actually an email-verify token, not another token type
    if (!verificationToken.identifier.startsWith("email-verify:")) {
      return NextResponse.json(
        { error: "Неверный токен или срок его действия истёк" },
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

    return NextResponse.json({ message: "Email подтверждён" });
  } catch (error) {
    logger.error("Verify email error", error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Ошибка при подтверждении email" },
      { status: 500 }
    );
  }
}
