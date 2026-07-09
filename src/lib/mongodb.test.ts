import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  command: vi.fn(),
}));

const mockClient = vi.hoisted(() => ({
  connect: vi.fn(),
  db: vi.fn(() => mockDb),
  close: vi.fn(),
}));

vi.mock("mongodb", () => ({
  MongoClient: vi.fn(() => mockClient),
}));

const mockGetConfig = vi.hoisted(() => vi.fn(() => ({
  dbType: "sqlite",
  mongodbUri: "",
  databaseUrl: "file:./dev.db",
  nextauthSecret: "test",
  nextauthUrl: "http://localhost:3000",
  nodeEnv: "test",
})));

vi.mock("./config", () => ({
  getConfig: mockGetConfig,
}));

vi.mock("./logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { connectMongo, disconnectMongo, checkMongoConnection } from "./mongodb";
import { MongoClient } from "mongodb";
import { logger } from "./logger";

function makeConfig(overrides: Partial<{ dbType: string; mongodbUri: string; databaseUrl: string; nextauthSecret: string; nextauthUrl: string; nodeEnv: string }> = {}) {
  return {
    dbType: "sqlite",
    mongodbUri: "",
    databaseUrl: "file:./dev.db",
    nextauthSecret: "test",
    nextauthUrl: "http://localhost:3000",
    nodeEnv: "test",
    ...overrides,
  };
}

describe("mongodb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    mockGetConfig.mockReturnValue(makeConfig());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("connectMongo", () => {
    beforeEach(async () => {
      await disconnectMongo();
    });

    it("creates a new connection when not connected", async () => {
      mockGetConfig.mockReturnValue(makeConfig({
        mongodbUri: "mongodb://localhost/test",
        dbType: "mongodb",
      }));
      mockClient.connect.mockResolvedValue(undefined);

      const result = await connectMongo();
      expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost/test", expect.any(Object));
      expect(mockClient.connect).toHaveBeenCalledOnce();
      expect(mockClient.db).toHaveBeenCalledOnce();
      expect(result).toBe(mockDb);
    });

    it("reuses existing connection if ping succeeds", async () => {
      mockGetConfig.mockReturnValue(makeConfig({
        mongodbUri: "mongodb://localhost/test",
        dbType: "mongodb",
      }));
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.db.mockReturnValue(mockDb);
      mockDb.command.mockResolvedValue({ ok: 1 });

      await connectMongo();
      const callsAfterFirst = vi.mocked(MongoClient).mock.calls.length;

      await connectMongo();
      expect(vi.mocked(MongoClient).mock.calls.length).toBe(callsAfterFirst);
    });

    it("reconnects if ping fails", async () => {
      mockGetConfig.mockReturnValue(makeConfig({
        mongodbUri: "mongodb://localhost/test",
        dbType: "mongodb",
      }));
      mockDb.command.mockRejectedValueOnce(new Error("ping failed"));
      mockClient.connect.mockResolvedValue(undefined);

      await connectMongo();

      await connectMongo();
      expect(mockClient.connect).toHaveBeenCalledTimes(2);
    });

    it("throws when MONGODB_URI is not set", async () => {
      mockGetConfig.mockReturnValue(makeConfig({
        dbType: "mongodb",
        mongodbUri: "",
      }));

      await expect(connectMongo()).rejects.toThrow("MONGODB_URI is required");
    });
  });

  describe("disconnectMongo", () => {
    it("closes the client and clears references", async () => {
      mockGetConfig.mockReturnValue(makeConfig({
        mongodbUri: "mongodb://localhost/test",
        dbType: "mongodb",
      }));
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.close.mockResolvedValue(undefined);

      await connectMongo();
      await disconnectMongo();

      expect(mockClient.close).toHaveBeenCalledOnce();
    });

    it("handles close errors gracefully", async () => {
      mockGetConfig.mockReturnValue(makeConfig({
        mongodbUri: "mongodb://localhost/test",
        dbType: "mongodb",
      }));
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.close.mockRejectedValue(new Error("close failed"));

      await connectMongo();
      await disconnectMongo();

      expect(logger.warn).toHaveBeenCalledWith("MongoDB close error", expect.any(Object));
    });

    it("is safe to call when not connected", async () => {
      await expect(disconnectMongo()).resolves.toBeUndefined();
    });
  });

  describe("checkMongoConnection", () => {
    it("returns false when no URI provided", async () => {
      mockGetConfig.mockReturnValue(makeConfig({ mongodbUri: "", dbType: "sqlite" }));

      const result = await checkMongoConnection();
      expect(result).toBe(false);
    });

    it("returns true when ping succeeds", async () => {
      mockGetConfig.mockReturnValue(makeConfig({
        mongodbUri: "mongodb://localhost/test",
        dbType: "mongodb",
      }));
      const testClient = { connect: vi.fn().mockResolvedValue(undefined), db: vi.fn().mockReturnValue({ command: vi.fn().mockResolvedValue({ ok: 1 }) }), close: vi.fn().mockResolvedValue(undefined) };
      vi.mocked(MongoClient).mockReturnValue(testClient as unknown as MongoClient);

      const result = await checkMongoConnection("mongodb://localhost/test");
      expect(result).toBe(true);
    });

    it("returns false when ping fails", async () => {
      mockGetConfig.mockReturnValue(makeConfig({
        mongodbUri: "mongodb://localhost/test",
        dbType: "mongodb",
      }));
      const testClient = { connect: vi.fn().mockResolvedValue(undefined), db: vi.fn().mockReturnValue({ command: vi.fn().mockRejectedValue(new Error("timeout")) }), close: vi.fn().mockResolvedValue(undefined) };
      vi.mocked(MongoClient).mockReturnValue(testClient as unknown as MongoClient);

      const result = await checkMongoConnection("mongodb://localhost/test");
      expect(result).toBe(false);
    });
  });
});
