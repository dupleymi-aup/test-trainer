import type { SWRConfiguration } from "swr";

/**
 * Custom SWR configuration with:
 * - Incremental static regeneration (ISR)
 * - Automatic revalidation on window focus
 * - Retry with exponential backoff
 * - Deduplication of requests
 * - Memory cache with TTL
 */
export const swrConfig: SWRConfiguration = {
  // Revalidate on window focus (when user returns to tab)
  revalidateOnFocus: true,
  
  // Revalidate when document becomes visible
  revalidateOnReconnect: true,
  
  // Deduplicate in-flight requests with same key
  dedupingInterval: 2000,
  
  // Enable background revalidation
  focusThrottleInterval: 5000,
  
  // Cache time-to-live (ms)
  // Data stays in cache even after component unmount
  errorRetryInterval: 5000,
  
  // Number of retry attempts
  errorRetryCount: 3,
  
  // Should we retry on error?
  shouldRetryOnError: true,
};
