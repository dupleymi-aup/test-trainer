import { describe, it, expect, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $queryRaw: vi.fn(),
  $on: vi.fn(),
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock("./config", () => ({
  getConfig: vi.fn(() => ({
    dbType: "sqlite",
    databaseUrl: "file:./dev.db",
    nextauthSecret: "test",
  })),
}));

describe("db", () => {
  it("creates and exports a PrismaClient instance", async () => {
    const { db } = await import("./db");
    expect(db).toBeDefined();
    expect(db.$connect).toBeInstanceOf(Function);
  });
});
