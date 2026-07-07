import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendSMS } from "./sms";

describe("sendSMS", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSmsProvider = process.env.SMS_PROVIDER;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalSmsProvider === undefined) {
      delete process.env.SMS_PROVIDER;
    } else {
      process.env.SMS_PROVIDER = originalSmsProvider;
    }
  });

  describe("input validation", () => {
    it("rejects invalid phone number", async () => {
      const result = await sendSMS({ phone: "abc", message: "test" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid phone number");
    });

    it("rejects empty message", async () => {
      const result = await sendSMS({ phone: "+79991234567", message: "" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Message cannot be empty");
    });

    it("rejects whitespace-only message", async () => {
      const result = await sendSMS({ phone: "+79991234567", message: "   " });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Message cannot be empty");
    });

    it("accepts international format +7XXXXXXXXXX", async () => {
      process.env.NODE_ENV = "development";
      const result = await sendSMS({ phone: "+79991234567", message: "test" });
      expect(result.success).toBe(true);
    });

    it("accepts 10-digit number without prefix", async () => {
      process.env.NODE_ENV = "development";
      const result = await sendSMS({ phone: "9991234567", message: "test" });
      expect(result.success).toBe(true);
    });

    it("accepts phone with dashes and spaces", async () => {
      process.env.NODE_ENV = "development";
      const result = await sendSMS({ phone: "+7 (999) 123-45-67", message: "test" });
      expect(result.success).toBe(true);
    });

    it("accepts 15-digit phone number", async () => {
      process.env.NODE_ENV = "development";
      const result = await sendSMS({ phone: "+123456789012345", message: "test" });
      expect(result.success).toBe(true);
    });

    it("rejects phone shorter than 10 digits", async () => {
      const result = await sendSMS({ phone: "+123456789", message: "test" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid phone number");
    });
  });

  describe("development mode", () => {
    it("returns success in development mode without calling provider", async () => {
      process.env.NODE_ENV = "development";
      const result = await sendSMS({ phone: "+79991234567", message: "hello" });
      expect(result.success).toBe(true);
    });
  });

  describe("provider routing", () => {
    it("returns error when no provider configured", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.SMS_PROVIDER;
      const result = await sendSMS({ phone: "+79991234567", message: "test" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("returns error for unknown provider", async () => {
      process.env.NODE_ENV = "production";
      process.env.SMS_PROVIDER = "unknown";
      const result = await sendSMS({ phone: "+79991234567", message: "test" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });
  });
});
