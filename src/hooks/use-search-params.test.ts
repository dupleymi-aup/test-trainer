import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSearchParams } from "./use-search-params";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/test",
  useSearchParams: () => new URLSearchParams("page=1&search=hello"),
}));

describe("useSearchParams", () => {
  it("reads existing params", () => {
    const { result } = renderHook(() => useSearchParams());
    expect(result.current.get("page")).toBe("1");
    expect(result.current.get("search")).toBe("hello");
    expect(result.current.get("missing")).toBeNull();
  });

  it("returns defaults for missing params", () => {
    const { result } = renderHook(() =>
      useSearchParams({ defaults: { page: "1", sort: "name" } })
    );
    expect(result.current.get("page")).toBe("1");
    expect(result.current.get("sort")).toBe("name");
  });

  it("existing param overrides default", () => {
    const { result } = renderHook(() =>
      useSearchParams({ defaults: { page: "1" } })
    );
    expect(result.current.get("page")).toBe("1");
  });

  it("has() returns true for existing or default params", () => {
    const { result } = renderHook(() =>
      useSearchParams({ defaults: { sort: "name" } })
    );
    expect(result.current.has("page")).toBe(true);
    expect(result.current.has("search")).toBe(true);
    expect(result.current.has("sort")).toBe(true);
    expect(result.current.has("nonexistent")).toBe(false);
  });

  it("getAll returns merged defaults + actual", () => {
    const { result } = renderHook(() =>
      useSearchParams({ defaults: { sort: "name" } })
    );
    const all = result.current.getAll();
    expect(all).toEqual({ page: "1", search: "hello", sort: "name" });
  });

  it("params is a URLSearchParams instance", () => {
    const { result } = renderHook(() => useSearchParams());
    expect(result.current.params).toBeInstanceOf(URLSearchParams);
    expect(result.current.params.get("page")).toBe("1");
  });
});
