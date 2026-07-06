import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

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
      logger.debug(`[EMAIL] To: ${to} | Subject: ${subject}`);
      return true;
    }
    throw new Error(
      "Email service not configured in production. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env"
    );
  }

  try {
    await transporter.sendMail({
      from: `"Test Trainer" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (error) {
    logger.error("Failed to send email", error instanceof Error ? error : undefined);
    throw error;
  }
}

export function generatePasswordResetEmail(token: string, baseUrl: string): { subject: string; html: string; text: string } {
  const url = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    subject: "Password Reset — Test Trainer",
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
      <p style="margin-top:16px;color:#666;font-size:12px;">This link is valid for 1 hour.</p>
    `,
    text: `Password reset. Follow this link: ${url}`,
  };
}

export function generateVerificationEmail(token: string, baseUrl: string): { subject: string; html: string; text: string } {
  const url = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
  return {
    subject: "Email Verification — Test Trainer",
    html: `
      <h2>Email Verification</h2>
      <p>Thank you for registering! Click the link below to verify your email:</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a>
    `,
    text: `Verify your email: ${url}`,
  };
}
