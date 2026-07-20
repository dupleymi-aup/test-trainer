import { mutate as swrMutate } from "swr";
import type { Key } from "swr";
import { swrMutateFetcher, type FetcherError } from "@/lib/swr-fetcher";

/**
 * Result of a mutation operation
 */
export interface UseSWRMutationResult<T> {
  /** Mutation data */
  data: T | undefined;
  /** Mutation error */
  error: FetcherError | null;
  /** Whether mutation is in progress */
  isMutating: boolean;
  /** Execute the mutation */
  mutate: (body?: Record<string, unknown>) => Promise<T>;
  /** Reset mutation state */
  reset: () => void;
}

/**
 * Options for SWR mutation
 */
export interface UseSWRMutationOptions {
  /** Invalidate these keys after successful mutation */
  invalidateKeys?: string[];
  /** Refetch these keys after successful mutation */
  revalidateKeys?: string[];
}

/**
 * Hook for POST/PUT/DELETE mutations with automatic cache invalidation
 * Uses global SWR mutate for cache invalidation
 * 
 * @example
 * ```ts
 * const { mutate: createTask, isMutating } = useSWRMutation<Task>(
 *   "/api/tasks",
 *   "POST",
 *   { invalidateKeys: ["/api/tasks"] }
 * );
 * 
 * await createTask({ name: "New Task" });
 * ```
 */
export function useSWRMutation<T = unknown>(
  url: string,
  method: "POST" | "PUT" | "DELETE" | "PATCH",
  options?: UseSWRMutationOptions
): UseSWRMutationResult<T> {
  const executeMutation = async (body?: Record<string, unknown>): Promise<T> => {
    const result = await swrMutateFetcher<T>(method, url, body);

    if (options?.invalidateKeys) {
      await Promise.all(
        options.invalidateKeys.map((key) => swrMutate(key))
      );
    }

    if (options?.revalidateKeys) {
      await Promise.all(
        options.revalidateKeys.map((key) => swrMutate(key))
      );
    }

    return result;
  };

  return {
    data: undefined,
    error: null,
    isMutating: false,
    mutate: executeMutation,
    reset: () => {},
  };
}

/**
 * Execute mutation with optimistic UI updates
 * Sets optimistic data immediately, reverts on error
 * 
 * @example
 * ```ts
 * await mutateWithOptimistic(
 *   mutate,
 *   "/api/favorites",
 *   optimisticData,
 *   () => deleteFavorite(taskId),
 *   previousData
 * );
 * ```
 */
export async function mutateWithOptimistic<T>(
  mutate: (key: Key, data?: T, options?: { revalidate: boolean }) => Promise<void>,
  key: string,
  optimisticData: T,
  mutationFn: () => Promise<T>,
  revertData: T
): Promise<T> {
  await mutate(key, optimisticData, { revalidate: false });

  try {
    const result = await mutationFn();
    await mutate(key, result, { revalidate: false });
    return result;
  } catch (err) {
    await mutate(key, revertData, { revalidate: false });
    throw err;
  }
}
