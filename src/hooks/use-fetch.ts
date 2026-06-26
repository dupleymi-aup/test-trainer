"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetchJson, APIError, ApiFetchJsonOptions } from "@/lib/api-client";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 5 * 60 * 1000;

export function invalidateFetchCache(pattern?: string) {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

interface UseFetchOptions<T> extends ApiFetchJsonOptions {
  ttl?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: APIError) => void;
}

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: APIError | null;
  refetch: () => void;
}

export function useFetch<T>(
  url: string,
  options?: UseFetchOptions<T>
): UseFetchResult<T> {
  const { ttl = DEFAULT_TTL, enabled = true, onSuccess, onError, init, timeoutMs } = options || {};

  const [data, setData] = useState<T | null>(() => {
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }
    return null;
  });
  const [loading, setLoading] = useState(!data && enabled);
  const [error, setError] = useState<APIError | null>(null);

  const urlRef = useRef(url);
  urlRef.current = url;

  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    const currentUrl = urlRef.current;
    const cached = cache.get(currentUrl);
    if (cached && Date.now() - cached.timestamp < ttl) {
      setData(cached.data as T);
      setLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await apiFetchJson<T>(currentUrl, { init, timeoutMs });
      if (fetchId !== fetchIdRef.current) return;

      cache.set(currentUrl, { data: result, timestamp: Date.now() });
      setData(result);
      setError(null);
      onSuccess?.(result);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      const apiError = err instanceof APIError ? err : new APIError("Network error", 0, err);
      setError(apiError);
      onError?.(apiError);
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, [enabled, ttl, init, timeoutMs, onSuccess, onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    cache.delete(urlRef.current);
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}
