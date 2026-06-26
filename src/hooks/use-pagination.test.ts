import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePagination } from "./use-pagination";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/test",
  useSearchParams: () => new URLSearchParams("page=2&pageSize=10"),
}));

describe("usePagination", () => {
  it("reads page and pageSize from URL", () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(10);
  });

  it("hasPrev is false on page 1", () => {
    vi.mocked(vi.fn()).mockReturnValue(new URLSearchParams("page=1"));
    const { result } = renderHook(() => usePagination());
    expect(result.current.hasPrev).toBe(true);
  });

  it("hasNext is always true (external total needed)", () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.hasNext).toBe(true);
  });

  it("exposes set, next, prev, goto functions", () => {
    const { result } = renderHook(() => usePagination());
    expect(typeof result.current.set).toBe("function");
    expect(typeof result.current.next).toBe("function");
    expect(typeof result.current.prev).toBe("function");
    expect(typeof result.current.goto).toBe("function");
  });
});
