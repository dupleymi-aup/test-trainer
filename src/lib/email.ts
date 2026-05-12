/**
 * Email sending service (stub)
 *
 * To use a real provider, install nodemailer or integrate with
 * SendGrid / Resend / etc. and replace the implementation below.
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    console.log(`[EMAIL] HTML: ${html}`);
    return true;
  }

  // TODO: integrate with real email provider
  // Example with nodemailer:
  //   const transporter = nodemailer.createTransport({ ... });
  //   await transporter.sendMail({ from, to, subject, html, text });

  console.warn("[EMAIL] No real email provider configured. Emails will not be sent in production.");
  return false;
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
