import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFetch, invalidateFetchCache } from "./use-fetch";

const mockFetchJson = vi.fn();

vi.mock("@/lib/api-client", () => ({
  apiFetchJson: (...args: unknown[]) => mockFetchJson(...args),
  APIError: class APIError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "APIError";
      this.status = status;
    }
  },
}));

beforeEach(() => {
  mockFetchJson.mockReset();
  invalidateFetchCache();
});

afterEach(() => {
  invalidateFetchCache();
});

describe("useFetch", () => {
  it("fetches data on mount", async () => {
    const mockData = { users: ["a"] };
    mockFetchJson.mockResolvedValue(mockData);

    const { result } = renderHook(() => useFetch("/api/test"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("returns cached data on second render", async () => {
    const mockData = { cached: true };
    mockFetchJson.mockResolvedValue(mockData);

    const { result } = renderHook(() => useFetch("/api/cached"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const { result: result2 } = renderHook(() => useFetch("/api/cached"));
    await waitFor(() => expect(result2.current.loading).toBe(false));
    expect(result2.current.data).toEqual(mockData);
  });

  it("sets error on failure", async () => {
    const err = new Error("fail");
    (err as Error & { name: string }).name = "APIError";
    (err as Error & { status: number }).status = 500;
    mockFetchJson.mockRejectedValue(err);

    const { result } = renderHook(() => useFetch("/api/fail"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("does not fetch when enabled=false", async () => {
    renderHook(() => useFetch("/api/skip", { enabled: false }));
    expect(mockFetchJson).not.toHaveBeenCalled();
  });

  it("refetch clears cache and re-fetches", async () => {
    mockFetchJson.mockResolvedValue({ v: 1 });

    const { result } = renderHook(() => useFetch("/api/refetch"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetchJson.mockResolvedValue({ v: 2 });
    result.current.refetch();
    await waitFor(() => expect(result.current.data).toEqual({ v: 2 }));
  });

  it("calls onSuccess callback on successful fetch", async () => {
    const onSuccess = vi.fn();
    const mockData = { ok: true };
    mockFetchJson.mockResolvedValue(mockData);

    renderHook(() => useFetch("/api/success", { onSuccess }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(mockData));
  });

  it("calls onError callback on failed fetch", async () => {
    const onError = vi.fn();
    const err = new Error("fail");
    (err as Error & { name: string }).name = "APIError";
    (err as Error & { status: number }).status = 500;
    mockFetchJson.mockRejectedValue(err);

    renderHook(() => useFetch("/api/error-cb", { onError }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });
});

describe("invalidateFetchCache", () => {
  it("clears entire cache when called without pattern", async () => {
    mockFetchJson.mockResolvedValue({ cached: true });

    const { result } = renderHook(() => useFetch("/api/cache-clear"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    invalidateFetchCache();

    mockFetchJson.mockResolvedValue({ cached: false });
    result.current.refetch();
    await waitFor(() => expect(result.current.data).toEqual({ cached: false }));
  });

  it("clears matching entries when called with pattern", async () => {
    mockFetchJson.mockResolvedValue({ v: 1 });

    renderHook(() => useFetch("/api/analytics-students"));
    await waitFor(() => expect(mockFetchJson).toHaveBeenCalled());

    // Should not throw
    invalidateFetchCache("analytics");

    // Subsequent fetch should re-fetch (not from cache)
    mockFetchJson.mockClear();
    mockFetchJson.mockResolvedValue({ v: 2 });
    renderHook(() => useFetch("/api/analytics-students"));
    await waitFor(() => expect(mockFetchJson).toHaveBeenCalled());
  });

  it("returns undefined", () => {
    const result = invalidateFetchCache("nonexistent-pattern-xyz");
    expect(result).toBeUndefined();
  });
});
