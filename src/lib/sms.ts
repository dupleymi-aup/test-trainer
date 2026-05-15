/**
 * SMS sending service (stub)
 *
 * To use a real provider, integrate with Twilio, SMS.ru, or another
 * SMS gateway and replace the implementation below.
 */

import { generateSecureOTP } from "@/lib/crypto";

interface SendSMSOptions {
  phone: string;
  message: string;
}

export async function sendSMS({ phone, message }: SendSMSOptions): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    console.log(`[SMS] To: ${phone} | Message: ${message}`);
    return true;
  }

  // Production: SMS provider must be configured
  // Integrate with Twilio, SMS.ru, or another SMS gateway:
  //   const client = new twilio(accountSid, authToken);
  //   await client.messages.create({ from, to: phone, body: message });
  // Then set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env

  throw new Error(
    "SMS service not configured in production. Set up an SMS provider (Twilio, SMS.ru, etc.) in .env"
  );
}

export function generateOTPCode(): string {
  return generateSecureOTP();
}

export function generatePasswordResetSMS(code: string): string {
  return `Ваш код для восстановления пароля: ${code}. Действует 15 минут. Тренажёр тестирования.`;
}
