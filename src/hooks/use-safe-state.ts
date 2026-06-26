"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useSafeState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialState);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (mountedRef.current) {
        setState(value);
      }
    },
    []
  );

  return [state, safeSetState];
}
