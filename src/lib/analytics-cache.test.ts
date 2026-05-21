import { describe, it, expect, beforeEach } from "vitest";
import {
  makeCacheKey,
  getCache,
  setCache,
  invalidateCache,
  clearCache,
  getCacheStats,
  DEFAULT_TTL,
} from "./analytics-cache";

beforeEach(() => {
  clearCache();
});

describe("makeCacheKey", () => {
  it("creates key without params", () => {
    expect(makeCacheKey("hub")).toBe("analytics:hub");
  });

  it("creates key with params", () => {
    const key = makeCacheKey("predictions", { groupId: "g1", university: "test" });
    expect(key).toMatch(/^analytics:predictions:/);
  });

  it("creates consistent keys for same params", () => {
    const k1 = makeCacheKey("test", { a: "1", b: "2" });
    const k2 = makeCacheKey("test", { b: "2", a: "1" });
    expect(k1).toBe(k2);
  });
});

describe("getCache / setCache", () => {
  it("returns null for missing key", () => {
    expect(getCache("missing")).toBeNull();
  });

  it("stores and retrieves data", () => {
    setCache("test", { value: 42 });
    expect(getCache("test")).toEqual({ value: 42 });
  });

  it("respects TTL", () => {
    setCache("short", "data", 50);
    expect(getCache("short")).toBe("data");
    // Wait for expiry
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(getCache("short")).toBeNull();
        resolve();
      }, 100);
    });
  });

  it("uses default TTL", () => {
    setCache("default", "data");
    expect(getCache("default")).toBe("data");
  });
});

describe("invalidateCache", () => {
  it("invalidates matching pattern", () => {
    setCache("analytics:hub", {});
    setCache("analytics:predictions:abc", {});
    setCache("other:key", {});

    const count = invalidateCache("analytics:hub");
    expect(count).toBe(1);
    expect(getCache("analytics:hub")).toBeNull();
    expect(getCache("analytics:predictions:abc")).not.toBeNull();
  });

  it("invalidates with wildcard pattern", () => {
    setCache("analytics:hub", {});
    setCache("analytics:predictions:abc", {});
    setCache("other:key", {});

    const count = invalidateCache("analytics:*");
    expect(count).toBe(2);
    expect(getCache("analytics:hub")).toBeNull();
    expect(getCache("analytics:predictions:abc")).toBeNull();
    expect(getCache("other:key")).not.toBeNull();
  });

  it("returns 0 for no match", () => {
    setCache("test:key", {});
    expect(invalidateCache("nonexistent:*")).toBe(0);
  });
});

describe("clearCache", () => {
  it("clears all entries", () => {
    setCache("key1", {});
    setCache("key2", {});
    clearCache();
    expect(getCacheStats().size).toBe(0);
  });
});

describe("getCacheStats", () => {
  it("returns size and keys", () => {
    setCache("a", {});
    setCache("b", {});
    const stats = getCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.keys).toContain("a");
    expect(stats.keys).toContain("b");
  });

  it("cleans expired entries", () => {
    setCache("expired", {}, 10);
    setCache("valid", {}, 60000);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const stats = getCacheStats();
        expect(stats.size).toBe(1);
        expect(stats.keys).toContain("valid");
        resolve();
      }, 50);
    });
  });
});

describe("DEFAULT_TTL", () => {
  it("has expected values", () => {
    expect(DEFAULT_TTL.expensive).toBe(5 * 60 * 1000);
    expect(DEFAULT_TTL.simple).toBe(1 * 60 * 1000);
    expect(DEFAULT_TTL.medium).toBe(3 * 60 * 1000);
  });
});
