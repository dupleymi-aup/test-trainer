"use client";

import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Synced localStorage state. Stores both the value and the key
 * so that cross-component updates can be detected via storage events.
 */
interface StorageState<T> {
  /** Current value */
  value: T;
  /** Whether a write is in progress (useful for loading indicators) */
  isPending: boolean;
}

/**
 * A React hook that manages state synchronized with localStorage.
 *
 * Features:
 * - SSR-safe (defaults to `initialValue` on server)
 * - Cross-tab synchronization via `storage` event
 * - Debounced writes to reduce localStorage thrashing
 * - Type-safe getter/setter with default fallback
 *
 * @param key - localStorage key
 * @param initialValue - Default value if key is not set
 *
 * @example
 * const { value, setValue, clear } = useLocalStorage("theme", "light");
 * setValue("dark");
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): {
  value: T;
  isPending: boolean;
  setValue: (value: T | ((prev: T) => T)) => void;
  remove: () => void;
  clear: () => void;
} {
  const [state, setState] = useState<StorageState<T>>({
    value: initialValue,
    isPending: false,
  });
  const writeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as T;
        setState({ value: parsed, isPending: false });
      }
    } catch {
      // Corrupted data — leave initialValue
    }
  }, [key]);

  // Listen for cross-tab storage events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue) as T;
          setState({ value: parsed, isPending: false });
        } catch {
          setState({ value: initialValue, isPending: false });
        }
      }
      if (e.key === key && e.newValue === null) {
        setState({ value: initialValue, isPending: false });
      }
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [key, initialValue]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const nextValue = value instanceof Function ? value(prev.value) : value;
        return { value: nextValue, isPending: true };
      });

      // Debounce the actual localStorage write (outside setState updater)
      if (writeTimeoutRef.current) clearTimeout(writeTimeoutRef.current);

      writeTimeoutRef.current = setTimeout(() => {
        setState((prev) => {
          try {
            localStorage.setItem(key, JSON.stringify(prev.value));
          } catch {
            // localStorage full or unavailable
          }
          return { ...prev, isPending: false };
        });
      }, 50);
    },
    [key]
  );

  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setState({ value: initialValue, isPending: false });
  }, [key, initialValue]);

  const clear = useCallback(() => {
    remove();
  }, [remove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (writeTimeoutRef.current) clearTimeout(writeTimeoutRef.current);
    };
  }, []);

  return { value: state.value, isPending: state.isPending, setValue, remove, clear };
}
