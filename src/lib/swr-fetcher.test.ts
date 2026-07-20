import { describe, it, expect, vi } from "vitest";
import { swrFetcher, swrMutateFetcher } from "@/lib/swr-fetcher";

vi.mock("swr", () => ({
  default: vi.fn(),
}));

describe("swrFetcher", () => {
  it("returns data on successful response", async () => {
    const mockData = { id: 1, name: "test" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await swrFetcher<typeof mockData>("/api/test");
    expect(result).toEqual(mockData);
  });

  it("throws on error response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Not found" }),
    });

    await expect(swrFetcher("/api/test")).rejects.toThrow("Not found");
  });
});

describe("swrMutateFetcher", () => {
  it("POST returns data", async () => {
    const mockData = { id: 1, created: true };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await swrMutateFetcher("POST", "/api/test", { name: "test" });
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "test" }),
      })
    );
  });

  it("DELETE returns data", async () => {
    const mockData = { deleted: true };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await swrMutateFetcher("DELETE", "/api/test/1");
    expect(result).toEqual(mockData);
  });
});
