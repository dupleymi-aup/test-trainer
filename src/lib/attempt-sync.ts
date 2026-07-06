/**
 * Attempt sync utility — syncs attempt data to the server.
 * Non-blocking, fire-and-forget pattern for background syncing.
 */

import { apiFetch } from "@/lib/api-client";
import { logger } from "@/lib/logger";

export interface AttemptSyncPayload {
  taskId: string;
  testCases: {
    id: string;
    inputs: unknown[];
    expectedOutput: string;
    category: string;
    comment?: string;
  }[];
  score: number;
  ecCoverage: number;
  bvCoverage: number;
  correctness: number;
  coveredEcIds: string[];
  coveredBvDescriptions: string[];
  timeSpent: number;
}

export async function syncAttemptToServer(
  payload: AttemptSyncPayload
): Promise<boolean> {
  try {
    const res = await apiFetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn("Failed to sync attempt to server", { status: res.status });
      return false;
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Failed to sync attempt to server", { error: message });
    return false;
  }
}
