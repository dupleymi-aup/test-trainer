import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncAttemptToServer, type AttemptSyncPayload } from "./attempt-sync";

const mockApiFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const basePayload: AttemptSyncPayload = {
  taskId: "1",
  testCases: [
    {
      id: "tc-1",
      inputs: [1, 2],
      expectedOutput: "3",
      category: "Normal",
    },
  ],
  score: 85,
  ecCoverage: 80,
  bvCoverage: 70,
  correctness: 100,
  coveredEcIds: ["ec-1", "ec-2"],
  coveredBvDescriptions: ["bv-1"],
  timeSpent: 120,
};

describe("syncAttemptToServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true on successful sync", async () => {
    mockApiFetch.mockResolvedValueOnce({ ok: true });

    const result = await syncAttemptToServer(basePayload);
    expect(result).toBe(true);
    expect(mockApiFetch).toHaveBeenCalledWith("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(basePayload),
    });
  });

  it("returns false when server returns non-ok status", async () => {
    mockApiFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const result = await syncAttemptToServer(basePayload);
    expect(result).toBe(false);
  });

  it("returns false on network error", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await syncAttemptToServer(basePayload);
    expect(result).toBe(false);
  });

  it("returns false when fetch throws a non-Error", async () => {
    mockApiFetch.mockRejectedValueOnce("string error");

    const result = await syncAttemptToServer(basePayload);
    expect(result).toBe(false);
  });
});
