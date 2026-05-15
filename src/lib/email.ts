import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
  const transporter = createTransporter();

  if (!transporter) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
      console.log(`[EMAIL] HTML: ${html}`);
      return true;
    }
    throw new Error(
      "Email service not configured in production. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env"
    );
  }

  try {
    await transporter.sendMail({
      from: `"Тренажёр тестирования" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send email:", error);
    throw error;
  }
}

export function generatePasswordResetEmail(token: string, baseUrl: string): { subject: string; html: string; text: string } {
  const url = `${baseUrl}/reset-password?token=${token}`;
  return {
    subject: "Восстановление пароля — Тренажёр тестирования",
    html: `
      <h2>Восстановление пароля</h2>
      <p>Вы запросили восстановление пароля. Нажмите на ссылку ниже, чтобы установить новый пароль:</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:6px;">Восстановить пароль</a>
      <p style="margin-top:16px;color:#666;font-size:12px;">Ссылка действительна 1 час.</p>
    `,
    text: `Восстановление пароля. Перейдите по ссылке: ${url}`,
  };
}

export function generateVerificationEmail(token: string, baseUrl: string): { subject: string; html: string; text: string } {
  const url = `${baseUrl}/verify-email?token=${token}`;
  return {
    subject: "Подтверждение email — Тренажёр тестирования",
    html: `
      <h2>Подтверждение email</h2>
      <p>Спасибо за регистрацию! Нажмите на ссылку ниже, чтобы подтвердить ваш email:</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:6px;">Подтвердить email</a>
    `,
    text: `Подтвердите email: ${url}`,
  };
}
