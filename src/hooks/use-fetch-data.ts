"use client";

import useSWR from "swr";
import { swrFetcher, type FetcherError } from "@/lib/swr-fetcher";

interface UseFetchDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Shared hook for fetching data with loading/error states.
 * Now backed by SWR for automatic caching, deduplication, and revalidation.
 * Maintains backward-compatible API.
 */
export function useFetchData<T>(url: string, _deps: unknown[] = []): UseFetchDataResult<T> {
  const { data, error, isLoading, mutate } = useSWR<T, FetcherError>(
    url,
    swrFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      errorRetryInterval: 5000,
      errorRetryCount: 3,
    }
  );

  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: () => mutate(),
  };
}
