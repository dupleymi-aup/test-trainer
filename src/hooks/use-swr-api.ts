import useSWR from "swr";
import type { SWRConfiguration, SWRResponse } from "swr";
import { swrFetcher, type FetcherError } from "@/lib/swr-fetcher";

export type { FetcherError };

interface UseSWROptions<T> {
  /** Enable/disable the fetch */
  enabled?: boolean;
  /** Cache time in ms (default: 5 minutes) */
  ttl?: number;
  /** Revalidation interval in ms (default: 30 seconds) */
  revalidateInterval?: number;
  /** Disable revalidation on focus */
  noRevalidateOnFocus?: boolean;
  /** Disable revalidation on window reconnect */
  noRevalidateOnReconnect?: boolean;
  /** Initial data to show while loading */
  fallbackData?: T;
}

/**
 * Typed SWR hook for GET requests
 * 
 * @example
 * ```ts
 * const { data, error, isLoading } = useSWRApi<User[]>("/api/users");
 * ```
 */
export function useSWRApi<T = unknown>(
  url: string | null,
  options?: UseSWROptions<T>
): SWRResponse<T, FetcherError> {
  const swrOptions: SWRConfiguration = {
    fetcher: swrFetcher,
    revalidateOnFocus: !options?.noRevalidateOnFocus,
    revalidateOnReconnect: !options?.noRevalidateOnReconnect,
    dedupingInterval: 2000,
    errorRetryInterval: 5000,
    errorRetryCount: 3,
    ...(options?.enabled !== undefined && { dedupingInterval: 0 }), // bypass cache if disabled
    ...(options?.fallbackData !== undefined && { fallbackData: options.fallbackData }),
    ...(options?.revalidateInterval !== undefined && { revalidateInterval: options.revalidateInterval }),
  };

  return useSWR<T, FetcherError>(url, swrFetcher, swrOptions);
}

/**
 * Hook with typed loading state
 */
export function useSWRApiLoading<T = unknown>(
  url: string | null,
  options?: UseSWROptions<T>
): {
  data: T | undefined;
  error: FetcherError | null;
  isLoading: boolean;
  isValidating: boolean;
  refetch: () => void;
  mutate: SWRResponse<T, FetcherError>["mutate"];
} {
  const { data, error, isLoading, isValidating, mutate } = useSWRApi<T>(url, options);

  return {
    data,
    error: error ?? null,
    isLoading,
    isValidating,
    refetch: () => mutate(),
    mutate,
  };
}
