import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useApiQuery } from "./use-api-query";

describe("useApiQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches data successfully", async () => {
    const mockData = { id: 1, name: "Test" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const { result } = renderHook(() =>
      useApiQuery({ url: "/api/test" })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("handles error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Not found" }),
    }));

    const { result } = renderHook(() =>
      useApiQuery({ url: "/api/test", retries: 0 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it("does not fetch when url is null", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderHook(() => useApiQuery({ url: null }));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not fetch when enabled is false", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderHook(() =>
      useApiQuery({ url: "/api/test", enabled: false })
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls onSuccess callback", async () => {
    const mockData = { id: 1 };
    const onSuccess = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    renderHook(() =>
      useApiQuery({ url: "/api/test", onSuccess })
    );

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });
  });

  it("calls onError callback", async () => {
    const onError = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    }));

    renderHook(() =>
      useApiQuery({ url: "/api/test", onError, retries: 0 })
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it("refetches data", async () => {
    const mockData = { id: 1 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const { result } = renderHook(() =>
      useApiQuery({ url: "/api/test" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => { result.current.refetch(); });

    expect(result.current.data).toEqual(mockData);
  });
});
