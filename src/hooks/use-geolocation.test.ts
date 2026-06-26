import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGeolocation } from "./use-geolocation";

describe("useGeolocation", () => {
  it("returns initial state", () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.latitude).toBeNull();
    expect(result.current.longitude).toBeNull();
    expect(result.current.accuracy).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("supports enableOnMount=false", () => {
    const { result } = renderHook(() => useGeolocation({ enableOnMount: false }));
    expect(result.current.loading).toBe(false);
  });
});
