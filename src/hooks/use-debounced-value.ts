"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseDebouncedValueReturn<T> {
  debouncedValue: T;
  cancel: () => void;
  isPending: boolean;
}

export function useDebouncedValue<T>(value: T, delay = 300): UseDebouncedValueReturn<T> {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isPending, setIsPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRef = useRef(value);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPending(false);
  }, []);

  useEffect(() => {
    if (value === debouncedRef.current) {
      setIsPending(false);
      return;
    }

    setIsPending(true);

    timerRef.current = setTimeout(() => {
      debouncedRef.current = value;
      setDebouncedValue(value);
      timerRef.current = null;
      setIsPending(false);
    }, delay);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, delay]);

  return { debouncedValue, cancel, isPending };
}
