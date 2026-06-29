import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useLockBodyScroll } from "./use-lock-body-scroll";

describe("useLockBodyScroll", () => {
  afterEach(() => {
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  });

  it("locks body scroll when enabled", () => {
    renderHook(() => useLockBodyScroll(true));
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("does not lock body scroll when disabled", () => {
    renderHook(() => useLockBodyScroll(false));
    expect(document.body.style.overflow).toBe("");
  });

  it("restores scroll on unmount", () => {
    const { unmount } = renderHook(() => useLockBodyScroll(true));
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("adds padding to compensate for scrollbar", () => {
    vi.stubGlobal("innerWidth", 1024);
    Object.defineProperty(document.documentElement, "clientWidth", {
      value: 1000,
      configurable: true,
    });

    renderHook(() => useLockBodyScroll(true));
    expect(document.body.style.paddingRight).toBe("24px");
  });

  it("restores original padding on unmount", () => {
    document.body.style.paddingRight = "10px";

    const { unmount } = renderHook(() => useLockBodyScroll(true));
    unmount();

    expect(document.body.style.paddingRight).toBe("10px");
  });
});
