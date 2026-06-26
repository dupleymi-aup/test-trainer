"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams as useNextSearchParams } from "next/navigation";

interface UsePaginationOptions {
  defaultPage?: number;
  defaultPageSize?: number;
}

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  set: (updates: { page?: number; pageSize?: number }) => void;
  next: () => void;
  prev: () => void;
  goto: (page: number) => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function usePagination(
  options?: UsePaginationOptions
): UsePaginationReturn {
  const { defaultPage = 1, defaultPageSize = 20 } = options || {};
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useNextSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page") || String(defaultPage), 10));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || String(defaultPageSize), 10));

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        newParams.set(key, value);
      }
      router.push(`${pathname}?${newParams.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const set = useCallback(
    (updates: { page?: number; pageSize?: number }) => {
      const nextUpdates: Record<string, string> = {};
      if (updates.page !== undefined) nextUpdates.page = String(Math.max(1, updates.page));
      if (updates.pageSize !== undefined) nextUpdates.pageSize = String(Math.max(1, updates.pageSize));
      updateParams(nextUpdates);
    },
    [updateParams]
  );

  const next = useCallback(() => set({ page: page + 1 }), [set, page]);
  const prev = useCallback(() => set({ page: Math.max(1, page - 1) }), [set, page]);
  const goto = useCallback((p: number) => set({ page: p }), [set]);

  return useMemo(
    () => ({
      page,
      pageSize,
      set,
      next,
      prev,
      goto,
      hasPrev: page > 1,
      hasNext: true,
    }),
    [page, pageSize, set, next, prev, goto]
  );
}
