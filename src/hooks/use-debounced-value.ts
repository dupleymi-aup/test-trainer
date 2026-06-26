"use client";

import { useState, useCallback, useRef } from "react";

interface UseDebouncedValueReturn<T> {
  debouncedValue: T;
  cancel: () => void;
  isPending: boolean;
}

export function useDebouncedValue<T>(value: T, delay = 300): UseDebouncedValueReturn<T> {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isPending, setIsPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPending(false);
    cancelledRef.current = true;
  }, []);

  if (value !== debouncedValue && !timerRef.current && !cancelledRef.current) {
    setIsPending(true);
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
      setIsPending(false);
      timerRef.current = null;
    }, delay);
  }

  if (cancelledRef.current && value === debouncedValue) {
    cancelledRef.current = false;
  }

  return { debouncedValue, cancel, isPending };
}
