import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIntersectionObserver } from "./use-intersection-observer";

describe("useIntersectionObserver", () => {
  it("returns ref, isIntersecting, entry", () => {
    const { result } = renderHook(() => useIntersectionObserver());
    expect(typeof result.current.ref).toBe("function");
    expect(typeof result.current.isIntersecting).toBe("boolean");
    expect(result.current.entry).toBeNull();
  });
});
