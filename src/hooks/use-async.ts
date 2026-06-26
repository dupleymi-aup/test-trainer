"use client";

import { useState, useCallback, useRef } from "react";

interface UseAsyncReturn<T, A extends unknown[]> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: A) => Promise<T | null>;
  reset: () => void;
}

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  immediate?: boolean;
}

export function useAsync<T, A extends unknown[] = [][]>(
  asyncFn: (...args: A) => Promise<T>,
  options?: UseAsyncOptions<T>
): UseAsyncReturn<T, A> {
  const { onSuccess, onError } = options || {};

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef(0);

  const execute = useCallback(
    async (...args: A): Promise<T | null> => {
      const executionId = ++abortRef.current;
      setLoading(true);
      setError(null);

      try {
        const result = await asyncFn(...args);
        if (executionId !== abortRef.current) return null;
        setData(result);
        setLoading(false);
        onSuccess?.(result);
        return result;
      } catch (err) {
        if (executionId !== abortRef.current) return null;
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setLoading(false);
        onError?.(error);
        return null;
      }
    },
    [asyncFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}
