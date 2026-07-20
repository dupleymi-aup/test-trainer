"use client";

import { useState, useCallback } from "react";

/**
 * A React hook that manages a boolean state with toggle, setTrue, setFalse helpers.
 *
 * Features:
 * - Simple API: toggle(), setTrue(), setFalse()
 * - TypeScript-friendly with optional initial value
 *
 * @param initialValue - Initial boolean value (default: false)
 *
 * @example
 * const { value, toggle, setTrue } = useBoolean(true);
 * toggle();    // false
 * setTrue();   // true
 */
export function useBoolean(initialValue = false): {
  value: boolean;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
  setValue: (value: boolean) => void;
} {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return { value, toggle, setTrue, setFalse, setValue };
}
