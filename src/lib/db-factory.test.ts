import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrismaDb = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
}));

const mockMongoRef = vi.hoisted(() => ({ db: null as any }));
const mockConnectMongo = vi.hoisted(() => vi.fn());
const mockCheckMongoConnection = vi.hoisted(() => vi.fn());

const mockConfig = vi.hoisted(() => ({
  dbType: "sqlite" as string,
  databaseUrl: "file:./dev.db",
  mongodbUri: "",
  nextauthSecret: "test-secret",
  nextauthUrl: "http://localhost:3000",
  nodeEnv: "test",
}));

vi.mock("./config", () => ({
  getConfig: vi.fn(() => ({ ...mockConfig })),
}));

vi.mock("./db", () => ({ db: mockPrismaDb }));
vi.mock("./mongodb", () => ({
  get db() { return mockMongoRef.db; },
  connectMongo: mockConnectMongo,
  checkMongoConnection: mockCheckMongoConnection,
}));

import { getDbInfo, checkMongoHealth, healthCheck } from "./db-factory";

describe("getDbInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.dbType = "sqlite";
    mockConfig.databaseUrl = "file:./dev.db";
    mockConfig.mongodbUri = "";
    mockMongoRef.db = null;
  });

  it("returns prisma db for sqlite type", async () => {
    mockConfig.dbType = "sqlite";
    mockConfig.databaseUrl = "file:./test.db";

    const info = await getDbInfo();
    expect(info.type).toBe("sqlite");
    expect(info.prisma).toBe(mockPrismaDb);
    expect(info.mongo).toBeNull();
    expect(info.url).toBe("file:./test.db");
  });

  it("returns prisma db for postgres type", async () => {
    mockConfig.dbType = "postgres";
    mockConfig.databaseUrl = "postgres://localhost/test";

    const info = await getDbInfo();
    expect(info.type).toBe("postgres");
    expect(info.prisma).toBe(mockPrismaDb);
    expect(info.mongo).toBeNull();
  });

  it("returns mongo db for mongodb type and connects if needed", async () => {
    mockConfig.dbType = "mongodb";
    mockConfig.mongodbUri = "mongodb://localhost/test";
    mockMongoRef.db = null as any;
    mockConnectMongo.mockImplementation(async () => {
      mockMongoRef.db = { command: vi.fn() };
    });

    const info = await getDbInfo();
    expect(info.type).toBe("mongodb");
    expect(info.prisma).toBeNull();
    expect(info.mongo).toBe(mockMongoRef.db);
    expect(info.url).toBe("mongodb://localhost/test");
    expect(mockConnectMongo).toHaveBeenCalledOnce();
  });

  it("does not call connectMongo if already connected", async () => {
    mockConfig.dbType = "mongodb";
    mockConfig.mongodbUri = "mongodb://localhost/test";
    mockMongoRef.db = null as any;
    mockConnectMongo.mockImplementation(async () => {
      mockMongoRef.db = { command: vi.fn() };
    });

    await getDbInfo();
    expect(mockConnectMongo).toHaveBeenCalledTimes(1);

    await getDbInfo();
    expect(mockConnectMongo).toHaveBeenCalledTimes(1);
  });

  it("connects on first call when not connected and reuses on second", async () => {
    mockConfig.dbType = "mongodb";
    mockConfig.mongodbUri = "mongodb://localhost/test";
    mockMongoRef.db = null as any;
    mockConnectMongo.mockImplementation(async () => {
      mockMongoRef.db = { command: vi.fn() };
    });

    await getDbInfo();
    expect(mockConnectMongo).toHaveBeenCalledTimes(1);

    await getDbInfo();
    expect(mockConnectMongo).toHaveBeenCalledTimes(1);
  });
});

describe("checkMongoHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.dbType = "sqlite";
    mockConfig.mongodbUri = "";
  });

  it("returns not ok when MONGODB_URI not configured", async () => {
    mockConfig.mongodbUri = "";
    const result = await checkMongoHealth();
    expect(result.ok).toBe(false);
    expect(result.details).toContain("not configured");
  });

  it("returns ok when mongo is reachable", async () => {
    mockConfig.mongodbUri = "mongodb://localhost/test";
    mockCheckMongoConnection.mockResolvedValueOnce(true);

    const result = await checkMongoHealth();
    expect(result.ok).toBe(true);
    expect(result.details).toBe("MongoDB reachable");
  });

  it("returns not ok when mongo is unreachable", async () => {
    mockConfig.mongodbUri = "mongodb://localhost/test";
    mockCheckMongoConnection.mockResolvedValueOnce(false);

    const result = await checkMongoHealth();
    expect(result.ok).toBe(false);
    expect(result.details).toBe("MongoDB unreachable");
  });
});

describe("healthCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.dbType = "sqlite";
    mockConfig.mongodbUri = "";
    mockMongoRef.db = null;
  });

  it("returns ok for sqlite with prisma", async () => {
    mockConfig.dbType = "sqlite";
    mockPrismaDb.$queryRaw.mockResolvedValueOnce([{ "1": 1 }]);

    const result = await healthCheck();
    expect(result.ok).toBe(true);
    expect(result.type).toBe("sqlite");
    expect(result.details).toContain("connected");
  });

  it("returns ok for mongodb", async () => {
    mockConfig.dbType = "mongodb";
    mockConfig.mongodbUri = "mongodb://localhost/test";
    mockMongoRef.db = { command: vi.fn().mockResolvedValueOnce({ ok: 1 }) };

    const result = await healthCheck();
    expect(result.ok).toBe(true);
    expect(result.type).toBe("mongodb");
    expect(result.details).toBe("MongoDB connected");
  });

  it("returns not ok when mongodb ping fails", async () => {
    mockConfig.dbType = "mongodb";
    mockConfig.mongodbUri = "mongodb://localhost/test";
    mockMongoRef.db = { command: vi.fn().mockRejectedValueOnce(new Error("not connected")) };

    const result = await healthCheck();
    expect(result.ok).toBe(false);
  });

  it("handles errors gracefully", async () => {
    mockConfig.dbType = "sqlite";
    mockPrismaDb.$queryRaw.mockRejectedValueOnce(new Error("connection refused"));

    const result = await healthCheck();
    expect(result.ok).toBe(false);
    expect(result.details).toBe("connection refused");
  });
});
