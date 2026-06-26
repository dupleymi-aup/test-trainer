import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDoubleClick } from "./use-double-click";

describe("useDoubleClick", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls onSingleClick after delay with one click", () => {
    vi.useFakeTimers();
    const onSingleClick = vi.fn();
    const onDoubleClick = vi.fn();
    const { result } = renderHook(() =>
      useDoubleClick({ onSingleClick, onDoubleClick, delay: 300 })
    );

    result.current({ nativeEvent: new MouseEvent("click") } as React.MouseEvent);
    vi.advanceTimersByTime(300);

    expect(onSingleClick).toHaveBeenCalledOnce();
    expect(onDoubleClick).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("calls onDoubleClick on two quick clicks", () => {
    vi.useFakeTimers();
    const onSingleClick = vi.fn();
    const onDoubleClick = vi.fn();
    const { result } = renderHook(() =>
      useDoubleClick({ onSingleClick, onDoubleClick, delay: 300 })
    );

    result.current({ nativeEvent: new MouseEvent("click") } as React.MouseEvent);
    result.current({ nativeEvent: new MouseEvent("click") } as React.MouseEvent);

    expect(onDoubleClick).toHaveBeenCalledOnce();
    expect(onSingleClick).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
