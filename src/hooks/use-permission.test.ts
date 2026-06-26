import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermission } from "./use-permission";

describe("usePermission", () => {
  it("returns unsupported when Permissions API unavailable", () => {
    const { result } = renderHook(() =>
      usePermission("camera" as PermissionName)
    );
    expect(result.current.state).toBe("unsupported");
    expect(result.current.status).toBe("unsupported");
  });
});
