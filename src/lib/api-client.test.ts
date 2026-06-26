import { describe, it, expect, vi, beforeEach } from "vitest";
import { APIError, apiFetch, apiFetchJson, apiFetchJsonSafe, apiFetchSafe } from "./api-client";

describe("APIError", () => {
  it("creates error with message and status", () => {
    const error = new APIError("Not found", 404);
    expect(error.message).toBe("Not found");
    expect(error.status).toBe(404);
    expect(error.name).toBe("APIError");
  });

  it("creates error with data", () => {
    const data = { field: "email" };
    const error = new APIError("Validation error", 400, data);
    expect(error.data).toEqual(data);
  });
});

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls fetch with credentials", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    await apiFetch("/api/test");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({ credentials: "same-origin" })
    );
  });

  it("adds CSRF header for POST requests", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    vi.stubGlobal("document", { cookie: "csrf-token=abc123" });

    await apiFetch("/api/test", { method: "POST" });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers.get("x-csrf-token")).toBe("abc123");
  });

  it("does not add CSRF header for GET requests", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    vi.stubGlobal("document", { cookie: "csrf-token=abc123" });

    await apiFetch("/api/test", { method: "GET" });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers.has("x-csrf-token")).toBe(false);
  });
});

describe("apiFetchJson", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed JSON on success", async () => {
    const mockData = { id: 1, name: "Test" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const result = await apiFetchJson<typeof mockData>("/api/test");
    expect(result).toEqual(mockData);
  });

  it("throws APIError on non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Not found" }),
    }));

    await expect(apiFetchJson("/api/test")).rejects.toThrow(APIError);
  });

  it("calls onError callback on failure", async () => {
    const onError = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    }));

    await apiFetchJson("/api/test", { onError }).catch(() => {});
    expect(onError).toHaveBeenCalled();
  });
});

describe("apiFetchJsonSafe", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns data on success", async () => {
    const mockData = { id: 1 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const result = await apiFetchJsonSafe("/api/test");
    expect(result).toEqual(mockData);
  });

  it("returns null on error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Error" }),
    }));

    const result = await apiFetchJsonSafe("/api/test");
    expect(result).toBeNull();
  });
});

describe("apiFetchSafe", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ok:true with data on success", async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({}) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await apiFetchSafe("/api/test");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(mockResponse);
    }
  });

  it("returns ok:false with error on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Bad request" }),
    }));

    const result = await apiFetchSafe("/api/test");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(APIError);
    }
  });

  it("returns ok:false on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const result = await apiFetchSafe("/api/test");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("Network error");
    }
  });
});
