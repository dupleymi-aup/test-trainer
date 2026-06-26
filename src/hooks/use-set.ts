"use client";

import { useState, useCallback } from "react";

interface UseSetReturn<T> {
  set: Set<T>;
  add: (value: T) => void;
  remove: (value: T) => void;
  clear: () => void;
  has: (value: T) => boolean;
}

export function useSet<T>(initialValues?: T[]): UseSetReturn<T> {
  const [set, setSet] = useState(() => new Set<T>(initialValues));

  const add = useCallback((value: T) => {
    setSet((prev) => {
      if (prev.has(value)) return prev;
      const next = new Set(prev);
      next.add(value);
      return next;
    });
  }, []);

  const remove = useCallback((value: T) => {
    setSet((prev) => {
      if (!prev.has(value)) return prev;
      const next = new Set(prev);
      next.delete(value);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSet(new Set());
  }, []);

  const has = useCallback((value: T) => set.has(value), [set]);

  return { set, add, remove, clear, has };
}
