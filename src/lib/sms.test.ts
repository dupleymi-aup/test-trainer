import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

const mockTwilioCreate = vi.hoisted(() => vi.fn());
const mockTwilio = vi.hoisted(() => vi.fn(() => ({ messages: { create: mockTwilioCreate } })));

vi.mock("twilio", () => ({ default: mockTwilio }));

import { sendSMS } from "./sms";

describe("sendSMS", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
      vi.stubEnv("NODE_ENV", "development");
      const result = await sendSMS({ phone: "+79991234567", message: "test" });
      expect(result.success).toBe(true);
    });

    it("accepts 10-digit number without prefix", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const result = await sendSMS({ phone: "9991234567", message: "test" });
      expect(result.success).toBe(true);
    });

    it("accepts phone with dashes and spaces", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const result = await sendSMS({ phone: "+7 (999) 123-45-67", message: "test" });
      expect(result.success).toBe(true);
    });

    it("accepts 15-digit phone number", async () => {
      vi.stubEnv("NODE_ENV", "development");
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
      vi.stubEnv("NODE_ENV", "development");
      const result = await sendSMS({ phone: "+79991234567", message: "hello" });
      expect(result.success).toBe(true);
    });
  });

  describe("provider routing", () => {
    it("returns error when no provider configured", async () => {
      vi.stubEnv("NODE_ENV", "production");
      delete process.env.SMS_PROVIDER;
      const result = await sendSMS({ phone: "+79991234567", message: "test" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("returns error for unknown provider", async () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.SMS_PROVIDER = "unknown";
      const result = await sendSMS({ phone: "+79991234567", message: "test" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });
  });

  describe("Twilio provider (production)", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.SMS_PROVIDER = "twilio";
      process.env.TWILIO_ACCOUNT_SID = "test-sid";
      process.env.TWILIO_AUTH_TOKEN = "test-token";
      process.env.TWILIO_PHONE_NUMBER = "+15551234567";
      mockTwilioCreate.mockReset();
    });

    it("sends SMS via Twilio successfully", async () => {
      mockTwilioCreate.mockResolvedValue({ sid: "SM123" });

      const result = await sendSMS({ phone: "+79991234567", message: "hello" });
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("SM123");
      expect(mockTwilioCreate).toHaveBeenCalledWith({
        body: "hello",
        from: "+15551234567",
        to: "+79991234567",
      });
      expect(mockTwilio).toHaveBeenCalledWith("test-sid", "test-token");
    });

    it("handles Twilio errors gracefully", async () => {
      mockTwilioCreate.mockRejectedValue(new Error("Twilio API error"));

      const result = await sendSMS({ phone: "+79991234567", message: "hello" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Twilio API error");
    });
  });

  describe("SMS.ru provider (production)", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.SMS_PROVIDER = "smsru";
      process.env.SMSRU_API_KEY = "test-api-key";
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("sends SMS via SMS.ru successfully", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ status: "ok", sms: [{ sms_id: "SMS123" }] }),
      } as unknown as Response);

      const result = await sendSMS({ phone: "+79991234567", message: "hello" });
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("SMS123");
    });

    it("handles SMS.ru API error response", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ status: "error", status_description: "Invalid API key" }),
      } as unknown as Response);

      const result = await sendSMS({ phone: "+79991234567", message: "hello" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid API key");
    });

    it("handles SMS.ru fetch errors gracefully", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await sendSMS({ phone: "+79991234567", message: "hello" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });
  });
});
