"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetchJson, APIError, ApiFetchJsonOptions } from "@/lib/api-client";
import { toast } from "sonner";

interface UseApiFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: APIError | null;
  refetch: () => void;
}

interface UseApiFetchOptions extends ApiFetchJsonOptions {
  /** Show a toast notification on error (default: true) */
  showToastOnError?: boolean;
  /** Custom error message for the toast */
  errorMessage?: string;
  /**
   * If true, the fetch is not executed automatically on mount.
   * You must call `refetch()` to trigger the request.
   */
  lazy?: boolean;
}

/**
 * Custom hook for data fetching with automatic loading, error state,
 * AbortController cleanup, and optional toast notifications.
 *
 * Options (init, onError, timeoutMs, etc.) are stored in refs to avoid
 * re-render loops when callers pass inline object literals.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApiFetch<User[]>("/api/users");
 */
export function useApiFetch<T>(
  url: string,
  options?: UseApiFetchOptions
): UseApiFetchResult<T> {
  const {
    init,
    onError,
    timeoutMs,
    showToastOnError = true,
    errorMessage,
    lazy = false,
  } = options || {};

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!lazy);
  const [error, setError] = useState<APIError | null>(null);

  const urlRef = useRef(url);
  urlRef.current = url;

  const initRef = useRef(init);
  initRef.current = init;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const timeoutMsRef = useRef(timeoutMs);
  timeoutMsRef.current = timeoutMs;

  const showToastRef = useRef(showToastOnError);
  showToastRef.current = showToastOnError;

  const errorMsgRef = useRef(errorMessage);
  errorMsgRef.current = errorMessage;

  const executeFetch = useCallback(() => {
    const controller = new AbortController();
    const currentUrl = urlRef.current;

    setLoading(true);
    setError(null);

    const handleError = (apiError: APIError) => {
      if (showToastRef.current) {
        toast.error(errorMsgRef.current || apiError.message);
      }
      onErrorRef.current?.(apiError);
    };

    apiFetchJson<T>(currentUrl, {
      init: { ...initRef.current, signal: controller.signal },
      onError: handleError,
      timeoutMs: timeoutMsRef.current,
    })
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err: APIError) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });

    return controller;
  }, []);

  useEffect(() => {
    if (lazy) return;

    const controller = executeFetch();
    return () => {
      controller.abort();
    };
  }, [executeFetch, lazy]);

  const refetch = useCallback(() => {
    executeFetch();
  }, [executeFetch]);

  return { data, loading, error, refetch };
}
