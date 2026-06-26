"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { APIError, apiFetchJson } from "@/lib/api-client";

interface UseApiQueryOptions<T> {
  url: string | null;
  enabled?: boolean;
  retries?: number;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: APIError) => void;
}

interface UseApiQueryResult<T> {
  data: T | null;
  error: APIError | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useApiQuery<T>({
  url,
  enabled = true,
  retries = 2,
  retryDelay = 1000,
  onSuccess,
  onError,
}: UseApiQueryOptions<T>): UseApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<APIError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!url || !enabled) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiFetchJson<T>(url, {
        init: { signal: abortControllerRef.current.signal },
      });
      setData(result);
      retryCountRef.current = 0;
      onSuccess?.(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;

      const apiError = err instanceof APIError ? err : new APIError("Unknown error", 0);

      if (retryCountRef.current < retries) {
        retryCountRef.current++;
        setTimeout(fetchData, retryDelay * retryCountRef.current);
        return;
      }

      setError(apiError);
      onError?.(apiError);
    } finally {
      setIsLoading(false);
    }
  }, [url, enabled, retries, retryDelay, onSuccess, onError]);

  useEffect(() => {
    fetchData();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchData]);

  return { data, error, isLoading, refetch: fetchData };
}
