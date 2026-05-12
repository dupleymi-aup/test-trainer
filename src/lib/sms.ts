/**
 * SMS sending service (stub)
 *
 * To use a real provider, integrate with Twilio, SMS.ru, or another
 * SMS gateway and replace the implementation below.
 */

interface SendSMSOptions {
  phone: string;
  message: string;
}

export async function sendSMS({ phone, message }: SendSMSOptions): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    console.log(`[SMS] To: ${phone} | Message: ${message}`);
    return true;
  }

  // TODO: integrate with real SMS provider
  // Example with Twilio:
  //   const client = new twilio(accountSid, authToken);
  //   await client.messages.create({ from, to: phone, body: message });

  console.warn("[SMS] No real SMS provider configured. SMS will not be sent in production.");
  return false;
}

export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generatePasswordResetSMS(code: string): string {
  return `Ваш код для восстановления пароля: ${code}. Действует 15 минут. Тренажёр тестирования.`;
}
