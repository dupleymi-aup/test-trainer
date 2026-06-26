"use client";

import { useState, useCallback } from "react";

export function useMergeState<T extends Record<string, unknown>>(
  initialState: T
): [T, (patch: Partial<T> | ((prev: T) => Partial<T>)) => void] {
  const [state, setState] = useState<T>(initialState);

  const merge = useCallback(
    (patch: Partial<T> | ((prev: T) => Partial<T>)) => {
      setState((prev) => {
        const resolved = typeof patch === "function" ? patch(prev) : patch;
        return { ...prev, ...resolved };
      });
    },
    []
  );

  return [state, merge];
}
