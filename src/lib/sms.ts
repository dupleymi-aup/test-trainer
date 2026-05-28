/**
 * SMS sending service with provider abstraction
 *
 * Supports multiple SMS providers via a unified interface.
 * Currently supports: Twilio, SMS.ru
 * Falls back to console logging in development.
 *
 * Configure in .env:
 *   SMS_PROVIDER=twilio        # or "smsru"
 *   TWILIO_ACCOUNT_SID=...
 *   TWILIO_AUTH_TOKEN=...
 *   TWILIO_PHONE_NUMBER=...
 *   SMSRU_API_KEY=...
 */

import { generateSecureOTP } from "@/lib/crypto";
import { logger } from "@/lib/logger";

interface SendSMSOptions {
  phone: string;
  message: string;
}

interface SMSProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Rate limiting: track last OTP send per phone (in-memory, use Redis in production)
const otpSendLog = new Map<string, number>();
const OTP_COOLDOWN_MS = 60_000; // 1 minute between OTPs
const OTP_MAX_AGE_MS = 15 * 60_000; // 15 minutes — OTP expiry
const OTP_CLEANUP_INTERVAL_MS = 5 * 60_000; // 5 minutes between cleanups

// Periodic cleanup of stale entries to prevent unbounded growth
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startOtpCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [phone, ts] of otpSendLog.entries()) {
      if (now - ts > OTP_MAX_AGE_MS) {
        otpSendLog.delete(phone);
      }
    }
    if (otpSendLog.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, OTP_CLEANUP_INTERVAL_MS);
  cleanupTimer.unref?.(); // Don't prevent Node.js from exiting
}

function purgeOtpSendLog() {
  otpSendLog.clear();
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

function validatePhone(phone: string): boolean {
  // Accept international format: +79991234567, 89991234567, etc.
  return /^\+?\d{10,15}$/.test(phone.replace(/[\s()-]/g, ""));
}

function checkRateLimit(phone: string): { allowed: boolean; retryAfter?: number } {
  const lastSent = otpSendLog.get(phone);
  if (!lastSent) return { allowed: true };

  const elapsed = Date.now() - lastSent;
  if (elapsed < OTP_COOLDOWN_MS) {
    return { allowed: false, retryAfter: Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000) };
  }
  return { allowed: true };
}

async function sendViaTwilio({ phone, message }: SendSMSOptions): Promise<SMSProviderResult> {
  try {
    // Lazy dynamic import for optional SMS provider
    const twilio = (await import("twilio")).default;
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const sms = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    return { success: true, messageId: sms.sid };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown Twilio error",
    };
  }
}

async function sendViaSMSRU({ phone, message }: SendSMSOptions): Promise<SMSProviderResult> {
  try {
    const apiKey = process.env.SMSRU_API_KEY;
    if (!apiKey) throw new Error("SMSRU_API_KEY not set");

    // Send API key in POST body instead of URL query string to avoid logging exposure
    const response = await fetch("https://sms.ru/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        api_id: apiKey,
        to: phone,
        msg: message,
        json: "1",
      }),
    });

    const data = await response.json();
    if (data.status === "ok") {
      return { success: true, messageId: data.sms?.[0]?.sms_id };
    }
    return { success: false, error: data.status_description || "SMS.ru error" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown SMS.ru error",
    };
  }
}

export async function sendSMS({ phone, message }: SendSMSOptions): Promise<SMSProviderResult> {
  // Input validation
  if (!validatePhone(phone)) {
    return { success: false, error: "Invalid phone number format" };
  }

  if (!message?.trim()) {
    return { success: false, error: "Message cannot be empty" };
  }

  // Development: log to console
  if (process.env.NODE_ENV === "development") {
    logger.debug(`[SMS] To: ${phone}`);
    return { success: true };
  }

  // Production: route to configured provider
  const provider = process.env.SMS_PROVIDER?.toLowerCase();

  switch (provider) {
    case "twilio":
      return await sendViaTwilio({ phone, message });
    case "smsru":
      return await sendViaSMSRU({ phone, message });
    default:
      return {
        success: false,
        error: `SMS provider "${provider}" not configured. Set SMS_PROVIDER=twilio|smsru and required env vars.`,
      };
  }
}

export async function sendOTP(phone: string): Promise<{
  success: boolean;
  code?: string;
  error?: string;
  retryAfter?: number;
}> {
  const rateLimit = checkRateLimit(phone);
  if (!rateLimit.allowed) {
    return { success: false, retryAfter: rateLimit.retryAfter, error: `Please wait ${rateLimit.retryAfter}s before requesting another code` };
  }

  const code = generateSecureOTP();
  const message = `Ваш код для восстановления пароля: ${code}. Действует 15 минут. Тренажёр тестирования.`;

  const result = await sendSMS({ phone, message });

  if (result.success) {
    otpSendLog.set(phone, Date.now());
    startOtpCleanup();
    return { success: true, code };
  }

  return { success: false, error: result.error };
}

export function generateOTPCode(): string {
  return generateSecureOTP();
}

export function generatePasswordResetSMS(code: string): string {
  return `Ваш код для восстановления пароля: ${code}. Действует 15 минут. Тренажёр тестирования.`;
}
