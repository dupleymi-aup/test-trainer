import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBoolean } from "./use-boolean";

describe("useBoolean", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with default false", () => {
    const { result } = renderHook(() => useBoolean());
    expect(result.current.value).toBe(false);
  });

  it("initializes with provided true", () => {
    const { result } = renderHook(() => useBoolean(true));
    expect(result.current.value).toBe(true);
  });

  it("toggles from false to true", () => {
    const { result } = renderHook(() => useBoolean(false));
    act(() => {
      result.current.toggle();
    });
    expect(result.current.value).toBe(true);
  });

  it("toggles from true to false", () => {
    const { result } = renderHook(() => useBoolean(true));
    act(() => {
      result.current.toggle();
    });
    expect(result.current.value).toBe(false);
  });

  it("sets to true explicitly", () => {
    const { result } = renderHook(() => useBoolean(false));
    act(() => {
      result.current.setTrue();
    });
    expect(result.current.value).toBe(true);
  });

  it("sets to false explicitly", () => {
    const { result } = renderHook(() => useBoolean(true));
    act(() => {
      result.current.setFalse();
    });
    expect(result.current.value).toBe(false);
  });

  it("sets arbitrary boolean value", () => {
    const { result } = renderHook(() => useBoolean(false));
    act(() => {
      result.current.setValue(true);
    });
    expect(result.current.value).toBe(true);
  });

  it("multiple toggles work correctly", () => {
    const { result } = renderHook(() => useBoolean(false));
    act(() => {
      result.current.toggle(); // true
      result.current.toggle(); // false
      result.current.toggle(); // true
    });
    expect(result.current.value).toBe(true);
  });

  it("setTrue does nothing when already true", () => {
    const { result } = renderHook(() => useBoolean(true));
    const initialRef = result.current.value;
    act(() => {
      result.current.setTrue();
    });
    expect(result.current.value).toBe(initialRef);
  });

  it("setFalse does nothing when already false", () => {
    const { result } = renderHook(() => useBoolean(false));
    const initialRef = result.current.value;
    act(() => {
      result.current.setFalse();
    });
    expect(result.current.value).toBe(initialRef);
  });
});
