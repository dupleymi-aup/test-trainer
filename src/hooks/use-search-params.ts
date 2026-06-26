"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams as useNextSearchParams } from "next/navigation";

interface UseSearchParamsOptions {
  /** Default values for params that may not exist in the URL */
  defaults?: Record<string, string>;
}

interface UseSearchParamsReturn {
  /** Get a single param value (returns default if not set) */
  get: (key: string) => string | null;
  /** Get all params as a record */
  getAll: () => Record<string, string>;
  /** Set one or more params, replacing the current history entry */
  set: (params: Record<string, string | null>) => void;
  /** Remove one or more params */
  remove: (...keys: string[]) => void;
  /** Check if a param exists */
  has: (key: string) => boolean;
  /** The raw URLSearchParams object (read-only) */
  params: URLSearchParams;
}

export function useSearchParams(
  options?: UseSearchParamsOptions
): UseSearchParamsReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  const { defaults = {} } = options || {};

  const params = useMemo(() => searchParams, [searchParams]);

  const get = useCallback(
    (key: string): string | null => {
      const value = params.get(key);
      return value ?? (key in defaults ? defaults[key] : null);
    },
    [params, defaults]
  );

  const getAll = useCallback((): Record<string, string> => {
    const result: Record<string, string> = { ...defaults };
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }, [params, defaults]);

  const set = useCallback(
    (updates: Record<string, string | null>) => {
      const newParams = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      const qs = newParams.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [params, pathname, router]
  );

  const remove = useCallback(
    (...keys: string[]) => {
      const updates: Record<string, null> = {};
      for (const key of keys) {
        updates[key] = null;
      }
      set(updates);
    },
    [set]
  );

  const has = useCallback(
    (key: string): boolean => {
      return params.has(key) || key in defaults;
    },
    [params, defaults]
  );

  return { get, getAll, set, remove, has, params };
}
