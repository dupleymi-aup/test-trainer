"use client";

import { useCallback, useMemo, useState } from "react";

interface UseCounterOptions {
  min?: number;
  max?: number;
  step?: number;
}

export function useCounter(
  initialValue: number = 0,
  options: UseCounterOptions = {}
): {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  set: (value: number) => void;
} {
  const { min = -Infinity, max = Infinity, step = 1 } = options;
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount((prev) => Math.min(prev + step, max));
  }, [step, max]);

  const decrement = useCallback(() => {
    setCount((prev) => Math.max(prev - step, min));
  }, [step, min]);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  const set = useCallback(
    (value: number) => {
      setCount(Math.min(Math.max(value, min), max));
    },
    [min, max]
  );

  return useMemo(
    () => ({ count, increment, decrement, reset, set }),
    [count, increment, decrement, reset, set]
  );
}
