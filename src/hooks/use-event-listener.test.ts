import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useRef } from "react";
import { useEventListener } from "./use-event-listener";

describe("useEventListener", () => {
  it("listens to window events", () => {
    const handler = vi.fn();
    renderHook(() => useEventListener("resize", handler));

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("listens to element events", () => {
    const handler = vi.fn();
    const div = document.createElement("div");
    document.body.appendChild(div);

    const ref = { current: div } as React.MutableRefObject<HTMLElement>;
    renderHook(() => useEventListener("click", handler as any, ref));

    act(() => {
      div.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(div);
  });

  it("cleans up listener on unmount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useEventListener("resize", handler));

    unmount();

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("updates handler without removing listener", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const { rerender } = renderHook(
      ({ h }) => useEventListener("resize", h),
      { initialProps: { h: handler1 } }
    );

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(handler1).toHaveBeenCalledTimes(1);

    rerender({ h: handler2 });

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("passes options to addEventListener", () => {
    const handler = vi.fn();
    const addSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useEventListener("resize", handler, null, { once: true }));

    expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function), { once: true });
  });
});
