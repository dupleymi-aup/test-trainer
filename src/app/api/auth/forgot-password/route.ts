import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, generatePasswordResetEmail } from "@/lib/email";
import { sendSMS, generateOTPCode, generatePasswordResetSMS } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, phone } = body;

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Укажите email или номер телефона" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    if (email) {
      const emailLower = email.toLowerCase().trim();
      const user = await db.user.findUnique({ where: { email: emailLower } });

      if (!user) {
        return NextResponse.json(
          { error: "Пользователь с таким email не найден" },
          { status: 404 }
        );
      }

      const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64");

      await db.verificationToken.create({
        data: {
          identifier: `password-reset:${user.id}`,
          token,
          expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      const emailData = generatePasswordResetEmail(token, baseUrl);
      await sendEmail({ to: emailLower, ...emailData });

      return NextResponse.json({
        message: "Инструкция по восстановлению отправлена на email",
        method: "email",
      });
    }

    if (phone) {
      const trimmedPhone = phone.trim();
      const user = await db.user.findUnique({ where: { phone: trimmedPhone } });

      if (!user) {
        return NextResponse.json(
          { error: "Пользователь с таким номером телефона не найден" },
          { status: 404 }
        );
      }

      const code = generateOTPCode();

      await db.verificationCode.create({
        data: {
          code,
          phone: trimmedPhone,
          expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      });

      const smsMessage = generatePasswordResetSMS(code);
      await sendSMS({ phone: trimmedPhone, message: smsMessage });

      return NextResponse.json({
        message: "Код восстановления отправлен по SMS",
        method: "phone",
        phone: trimmedPhone,
      });
    }

    return NextResponse.json(
      { error: "Укажите email или номер телефона" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Ошибка при отправке кода восстановления" },
      { status: 500 }
    );
  }
}
