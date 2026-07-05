import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useApiFetch } from "./use-api-fetch";

const { mockApiFetchJson, mockToastError } = vi.hoisted(() => ({
  mockApiFetchJson: vi.fn<(url: string, options?: Record<string, unknown>) => Promise<unknown>>(),
  mockToastError: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiFetchJson: (url: string, options?: Record<string, unknown>) => {
    const promise = mockApiFetchJson(url, options);
    const onError = options?.onError as ((err: Error) => void) | undefined;
    if (onError) {
      promise.catch((err: Error) => {
        onError(err);
      });
    }
    return promise;
  },
  APIError: class APIError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "APIError";
      this.status = status;
    }
  },
}));

vi.mock("sonner", () => ({
  toast: { error: mockToastError },
}));

beforeEach(() => {
  mockApiFetchJson.mockReset();
  mockToastError.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useApiFetch", () => {
  it("fetches data on mount", async () => {
    const mockData = { id: 1, name: "test" };
    mockApiFetchJson.mockResolvedValue(mockData);

    const { result } = renderHook(() => useApiFetch("/api/data"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("sets loading true initially", () => {
    mockApiFetchJson.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useApiFetch("/api/data"));
    expect(result.current.loading).toBe(true);
  });

  it("sets error on failure", async () => {
    const apiErr = new Error("Not found");
    (apiErr as Error & { name: string }).name = "APIError";
    (apiErr as Error & { status: number }).status = 404;
    mockApiFetchJson.mockRejectedValue(apiErr);

    const { result } = renderHook(() => useApiFetch("/api/fail"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.status).toBe(404);
    expect(result.current.data).toBeNull();
  });

  it("refetch re-executes the request", async () => {
    mockApiFetchJson.mockResolvedValueOnce({ v: 1 });

    const { result } = renderHook(() => useApiFetch("/api/refetch"));
    await waitFor(() => expect(result.current.data).toEqual({ v: 1 }));

    mockApiFetchJson.mockResolvedValueOnce({ v: 2 });
    act(() => { result.current.refetch(); });
    await waitFor(() => expect(result.current.data).toEqual({ v: 2 }));
  });

  it("does not fetch on mount when lazy=true", () => {
    const { result } = renderHook(() => useApiFetch("/api/lazy", { lazy: true }));
    expect(mockApiFetchJson).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("fetches on refetch after lazy mount", async () => {
    mockApiFetchJson.mockResolvedValue({ data: "ok" });
    const { result } = renderHook(() => useApiFetch("/api/lazy", { lazy: true }));

    act(() => { result.current.refetch(); });
    await waitFor(() => expect(result.current.data).toEqual({ data: "ok" }));
    expect(result.current.loading).toBe(false);
  });

  it("aborts request on unmount", () => {
    let capturedSignal: AbortSignal | undefined;
    mockApiFetchJson.mockImplementation((_url: string, options) => {
      const init = (options?.init ?? {}) as Record<string, unknown>;
      capturedSignal = init.signal as AbortSignal | undefined;
      return new Promise(() => {});
    });

    const { unmount } = renderHook(() => useApiFetch("/api/slow"));
    expect(capturedSignal?.aborted).toBe(false);

    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });

  it("shows toast on error by default", async () => {
    const apiErr = new Error("Server error");
    (apiErr as Error & { name: string }).name = "APIError";
    (apiErr as Error & { status: number }).status = 500;
    mockApiFetchJson.mockRejectedValue(apiErr);

    renderHook(() => useApiFetch("/api/error"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Server error");
    });
  });

  it("does not show toast when showToastOnError=false", async () => {
    const apiErr = new Error("Silent error");
    (apiErr as Error & { name: string }).name = "APIError";
    (apiErr as Error & { status: number }).status = 500;
    mockApiFetchJson.mockRejectedValue(apiErr);

    renderHook(() => useApiFetch("/api/silent", { showToastOnError: false }));

    await waitFor(() => {
      expect(mockToastError).not.toHaveBeenCalled();
    });
  });

  it("uses custom error message in toast", async () => {
    const apiErr = new Error("Server error");
    (apiErr as Error & { name: string }).name = "APIError";
    (apiErr as Error & { status: number }).status = 500;
    mockApiFetchJson.mockRejectedValue(apiErr);

    renderHook(() => useApiFetch("/api/error", { errorMessage: "Custom message" }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Custom message");
    });
  });
});
