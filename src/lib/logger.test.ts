import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  const consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
  const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const originalLogLevel = process.env.LOG_LEVEL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LOG_LEVEL = undefined;
  });

  afterEach(() => {
    if (originalLogLevel !== undefined) {
      process.env.LOG_LEVEL = originalLogLevel;
    } else {
      delete process.env.LOG_LEVEL;
    }
  });

  describe("debug", () => {
    it("does not output when LOG_LEVEL is not debug", () => {
      logger.debug("test message");
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it("outputs when LOG_LEVEL is debug", () => {
      process.env.LOG_LEVEL = "debug";
      logger.debug("debug message");
      expect(consoleDebugSpy).toHaveBeenCalledOnce();
    });

    it("formats JSON with timestamp, level, and message", () => {
      process.env.LOG_LEVEL = "debug";
      logger.debug("hello");
      const output = consoleDebugSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe("debug");
      expect(parsed.message).toBe("hello");
      expect(parsed.timestamp).toBeDefined();
    });

    it("includes context when provided", () => {
      process.env.LOG_LEVEL = "debug";
      logger.debug("with context", { key: "value" });
      const output = consoleDebugSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.context).toEqual({ key: "value" });
    });
  });

  describe("info", () => {
    it("outputs by default", () => {
      logger.info("info message");
      expect(consoleInfoSpy).toHaveBeenCalledOnce();
    });

    it("does not output when LOG_LEVEL is error", () => {
      process.env.LOG_LEVEL = "error";
      logger.info("info message");
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it("does not output when LOG_LEVEL is warn", () => {
      process.env.LOG_LEVEL = "warn";
      logger.info("info message");
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it("outputs when LOG_LEVEL is info", () => {
      process.env.LOG_LEVEL = "info";
      logger.info("info message");
      expect(consoleInfoSpy).toHaveBeenCalledOnce();
    });

    it("formats JSON with level info", () => {
      logger.info("test info");
      const output = consoleInfoSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe("info");
      expect(parsed.message).toBe("test info");
    });
  });

  describe("warn", () => {
    it("outputs by default", () => {
      logger.warn("warn message");
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
    });

    it("does not output when LOG_LEVEL is error", () => {
      process.env.LOG_LEVEL = "error";
      logger.warn("warn message");
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("outputs when LOG_LEVEL is warn", () => {
      process.env.LOG_LEVEL = "warn";
      logger.warn("warn message");
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
    });
  });

  describe("error", () => {
    it("outputs by default", () => {
      logger.error("error message");
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
    });

    it("extracts context from Error instance", () => {
      const err = new Error("test error");
      logger.error("error with Error", err);
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.context.name).toBe("Error");
      expect(parsed.context.message).toBe("test error");
      expect(parsed.context.stack).toBeDefined();
    });

    it("handles non-Error context", () => {
      logger.error("error with object", { details: "something" });
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.context).toEqual({ details: "something" });
    });

    it("formats JSON with level error", () => {
      logger.error("test error");
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe("error");
      expect(parsed.message).toBe("test error");
    });
  });
});
