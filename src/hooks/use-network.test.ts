import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNetwork } from "./use-network";

describe("useNetwork", () => {
  it("returns online state by default", () => {
    const { result } = renderHook(() => useNetwork());
    expect(result.current.online).toBe(true);
    expect(result.current.offline).toBe(false);
  });

  it("returns network info fields", () => {
    const { result } = renderHook(() => useNetwork());
    expect(result.current.rtt).toBeNull();
    expect(result.current.downlink).toBeNull();
    expect(result.current.effectiveType).toBeNull();
    expect(result.current.saveData).toBeNull();
  });
});
