"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseControllableValueOptions<T> {
  defaultValue?: T;
  value?: T;
  onChange?: (value: T) => void;
}

interface UseControllableValueReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  isControlled: boolean;
}

export function useControllableValue<T>(
  options: UseControllableValueOptions<T> = {}
): UseControllableValueReturn<T> {
  const { defaultValue, value: controlledValue, onChange } = options;
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (isControlled) {
      setInternalValue(controlledValue);
    }
  }, [isControlled, controlledValue]);

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setInternalValue((prev) => {
        const resolved = typeof newValue === "function"
          ? (newValue as (prev: T) => T)(prev as T)
          : newValue;
        onChangeRef.current?.(resolved);
        return resolved;
      });
    },
    []
  );

  return {
    value: (isControlled ? controlledValue : internalValue) as T,
    setValue,
    isControlled,
  };
}
