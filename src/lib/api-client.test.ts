import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { APIError, apiFetch, apiFetchJson } from "./api-client";

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
