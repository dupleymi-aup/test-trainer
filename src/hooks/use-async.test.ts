import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAsync } from "./use-async";

describe("useAsync", () => {
  it("starts with default state", () => {
    const { result } = renderHook(() => useAsync(async () => "data"));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("executes and returns data", async () => {
    const { result } = renderHook(() => useAsync(async () => "hello"));
    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.data).toBe("hello");
    expect(result.current.loading).toBe(false);
  });

  it("sets error on failure", async () => {
    const { result } = renderHook(() =>
      useAsync(async () => { throw new Error("boom"); })
    );
    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.error?.message).toBe("boom");
    expect(result.current.data).toBeNull();
  });

  it("calls onSuccess callback", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useAsync(async () => 42, { onSuccess })
    );
    await act(async () => {
      await result.current.execute();
    });
    expect(onSuccess).toHaveBeenCalledWith(42);
  });

  it("calls onError callback", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useAsync(async () => { throw new Error("fail"); }, { onError })
    );
    await act(async () => {
      await result.current.execute();
    });
    expect(onError).toHaveBeenCalledOnce();
  });

  it("reset clears state", async () => {
    const { result } = renderHook(() => useAsync(async () => "data"));
    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.data).toBe("data");

    act(() => {
      result.current.reset();
    });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
