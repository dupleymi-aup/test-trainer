import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useClipboard } from "./use-clipboard";

describe("useClipboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("copies text to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("hello");
    });

    expect(writeText).toHaveBeenCalledWith("hello");
    expect(result.current.copied).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("sets error on failure", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("fail");
    });

    expect(result.current.copied).toBe(false);
    expect(result.current.error?.message).toBe("denied");
  });

  it("resets copied after timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    const { result } = renderHook(() => useClipboard(100));

    await act(async () => {
      await result.current.copy("text");
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.copied).toBe(false);
    vi.useRealTimers();
  });
});
