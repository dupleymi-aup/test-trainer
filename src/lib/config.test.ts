import { describe, it, expect, vi, afterEach } from "vitest";

describe("config", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
  });

  it("loads config with required fields", async () => {
    vi.resetModules();
    process.env.NEXTAUTH_SECRET = "my-secret";
    const { getConfig } = await import("./config");
    const config = getConfig();
    expect(config.nextauthSecret).toBe("my-secret");
  });

  it("throws when NEXTAUTH_SECRET is missing", async () => {
    vi.resetModules();
    delete process.env.NEXTAUTH_SECRET;
    const { getConfig } = await import("./config");
    expect(() => getConfig()).toThrow("Invalid configuration");
  });

  it("defaults dbType to sqlite", async () => {
    vi.resetModules();
    process.env.NEXTAUTH_SECRET = "secret";
    delete process.env.DB_TYPE;
    const { getConfig } = await import("./config");
    const config = getConfig();
    expect(config.dbType).toBe("sqlite");
  });

  it("accepts postgres dbType", async () => {
    vi.resetModules();
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.DB_TYPE = "postgres";
    const { getConfig } = await import("./config");
    const config = getConfig();
    expect(config.dbType).toBe("postgres");
  });

  it("accepts mongodb dbType", async () => {
    vi.resetModules();
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.DB_TYPE = "mongodb";
    const { getConfig } = await import("./config");
    const config = getConfig();
    expect(config.dbType).toBe("mongodb");
  });

  it("rejects invalid dbType", async () => {
    vi.resetModules();
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.DB_TYPE = "invalid";
    const { getConfig } = await import("./config");
    expect(() => getConfig()).toThrow("Invalid configuration");
  });

  it("defaults nextauthUrl to localhost:3000", async () => {
    vi.resetModules();
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.DB_TYPE = "sqlite";
    delete process.env.NEXTAUTH_URL;
    const { getConfig } = await import("./config");
    const config = getConfig();
    expect(config.nextauthUrl).toBe("http://localhost:3000");
  });

  it("defaults nodeEnv to development", async () => {
    vi.resetModules();
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.DB_TYPE = "sqlite";
    vi.stubEnv("NODE_ENV", "development");
    const { getConfig } = await import("./config");
    const config = getConfig();
    expect(config.nodeEnv).toBe("development");
  });

  it("accepts optional smtp fields", async () => {
    vi.resetModules();
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.DB_TYPE = "sqlite";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASS = "pass123";
    process.env.SMTP_FROM = "no-reply@example.com";
    const { getConfig } = await import("./config");
    const config = getConfig();
    expect(config.smtpHost).toBe("smtp.example.com");
    expect(config.smtpPort).toBe("587");
    expect(config.smtpUser).toBe("user@example.com");
    expect(config.smtpPass).toBe("pass123");
    expect(config.smtpFrom).toBe("no-reply@example.com");
  });

  it("optional fields are undefined when not set", async () => {
    vi.resetModules();
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.DB_TYPE = "sqlite";
    delete process.env.SMTP_HOST;
    delete process.env.CRON_SECRET;
    delete process.env.MONGODB_URI;
    const { getConfig } = await import("./config");
    const config = getConfig();
    expect(config.smtpHost).toBeUndefined();
    expect(config.cronSecret).toBeUndefined();
    expect(config.mongodbUri).toBeUndefined();
  });
});
