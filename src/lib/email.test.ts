import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendMail = vi.fn<(...args: unknown[]) => Promise<unknown>>();

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}));

const env = process.env as Record<string, string | undefined>;
const ORIGINAL_ENV = { ...env };

import { sendEmail, generatePasswordResetEmail, generateVerificationEmail } from "./email";

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(env).forEach((k) => delete env[k]);
  Object.assign(env, ORIGINAL_ENV);
  delete env.SMTP_HOST;
  delete env.SMTP_USER;
  delete env.SMTP_PASS;
  delete env.NODE_ENV;
});

describe("generatePasswordResetEmail", () => {
  it("generates email with reset link", () => {
    const result = generatePasswordResetEmail("tok123", "http://localhost:3000");
    expect(result.subject).toContain("Восстановление пароля");
    expect(result.html).toContain("reset-password?token=tok123");
    expect(result.text).toContain("http://localhost:3000/reset-password?token=tok123");
  });

  it("encodes special characters in token", () => {
    const result = generatePasswordResetEmail("a+b/c", "http://example.com");
    expect(result.html).toContain("token=a%2Bb%2Fc");
  });
});

describe("generateVerificationEmail", () => {
  it("generates email with verification link", () => {
    const result = generateVerificationEmail("tok456", "http://localhost:3000");
    expect(result.subject).toContain("Подтверждение email");
    expect(result.html).toContain("verify-email?token=tok456");
    expect(result.text).toContain("http://localhost:3000/verify-email?token=tok456");
  });
});

describe("sendEmail", () => {
  it("returns true in dev mode when SMTP is not configured", async () => {
    env.NODE_ENV = "development";
    const result = await sendEmail({ to: "a@b.com", subject: "Test", html: "<p>Hi</p>" });
    expect(result).toBe(true);
  });

  it("throws in production when SMTP is not configured", async () => {
    env.NODE_ENV = "production";
    await expect(
      sendEmail({ to: "a@b.com", subject: "Test", html: "<p>Hi</p>" })
    ).rejects.toThrow("Email service not configured");
  });

  it("sends email via nodemailer when SMTP is configured", async () => {
    env.NODE_ENV = "production";
    env.SMTP_HOST = "smtp.example.com";
    env.SMTP_USER = "user@example.com";
    env.SMTP_PASS = "secret";
    mockSendMail.mockResolvedValueOnce({ accepted: ["a@b.com"] });

    const result = await sendEmail({ to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(result).toBe(true);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a@b.com", subject: "Hi" })
    );
  });

  it("throws when nodemailer send fails", async () => {
    env.NODE_ENV = "production";
    env.SMTP_HOST = "smtp.example.com";
    env.SMTP_USER = "user@example.com";
    env.SMTP_PASS = "secret";
    mockSendMail.mockRejectedValueOnce(new Error("Connection refused"));

    await expect(
      sendEmail({ to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" })
    ).rejects.toThrow("Connection refused");
  });

  it("uses SMTP_FROM when provided", async () => {
    env.NODE_ENV = "production";
    env.SMTP_HOST = "smtp.example.com";
    env.SMTP_USER = "user@example.com";
    env.SMTP_PASS = "secret";
    env.SMTP_FROM = "noreply@example.com";
    mockSendMail.mockResolvedValueOnce({ accepted: [] });

    await sendEmail({ to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.stringContaining("noreply@example.com") })
    );
  });
});
