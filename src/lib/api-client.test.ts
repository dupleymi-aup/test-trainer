import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { APIError, apiFetch, apiFetchJson, apiFetchJsonSafe, apiFetchSafe } from "./api-client";

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends GET request with credentials", async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    const res = await apiFetch("/api/test");

    expect(fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({ credentials: "same-origin" })
    );
    expect(res).toBe(mockResponse);
  });

  it("adds CSRF header for POST requests", async () => {
    vi.stubGlobal("document", { cookie: "csrf-token=abc123" });
    const mockResponse = new Response("{}", { status: 200 });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    await apiFetch("/api/test", { method: "POST" });

    const calledHeaders = vi.mocked(fetch).mock.calls[0][1]?.headers as Headers;
    expect(calledHeaders.get("X-CSRF-Token")).toBe("abc123");

    vi.unstubAllGlobals();
  });

  it("does not add CSRF header for GET requests", async () => {
    vi.stubGlobal("document", { cookie: "csrf-token=abc123" });
    const mockResponse = new Response("{}", { status: 200 });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    await apiFetch("/api/test", { method: "GET" });

    const calledHeaders = vi.mocked(fetch).mock.calls[0][1]?.headers as Headers;
    expect(calledHeaders.has("X-CSRF-Token")).toBe(false);

    vi.unstubAllGlobals();
  });
});

describe("apiFetchJson", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed JSON on success", async () => {
    const data = { users: ["a", "b"] };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(data), { status: 200 })
    );

    const result = await apiFetchJson<typeof data>("/api/users");
    expect(result).toEqual(data);
  });

  it("throws APIError on non-OK response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    );

    await expect(apiFetchJson("/api/missing")).rejects.toThrow(APIError);
  });

  it("calls onError callback on failure", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "fail" }), { status: 500 })
    );

    const onError = vi.fn();
    await expect(
      apiFetchJson("/api/fail", { onError })
    ).rejects.toThrow(APIError);
    expect(onError).toHaveBeenCalledOnce();
  });
});

describe("apiFetchJsonSafe", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns data on success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    const result = await apiFetchJsonSafe<{ ok: boolean }>("/api/test");
    expect(result).toEqual({ ok: true });
  });

  it("returns null on failure instead of throwing", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("error", { status: 500 })
    );

    const result = await apiFetchJsonSafe("/api/fail");
    expect(result).toBeNull();
  });
});

describe("apiFetchSafe", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns { ok: true, data } on success", async () => {
    const mockResponse = new Response("{}", { status: 200 });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    const result = await apiFetchSafe("/api/test");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(mockResponse);
    }
  });

  it("returns { ok: false, error } on HTTP error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "fail" }), { status: 403 })
    );

    const result = await apiFetchSafe("/api/fail");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(APIError);
      expect(result.error.status).toBe(403);
    }
  });

  it("returns { ok: false, error } on network error", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await apiFetchSafe("/api/offline");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(APIError);
      expect(result.error.status).toBe(0);
    }
  });
});
