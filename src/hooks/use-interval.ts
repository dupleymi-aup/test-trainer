"use client";

import { useEffect, useRef, useCallback } from "react";

export function useInterval(
  callback: () => void,
  delay: number | null
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const tick = useCallback(() => {
    savedCallback.current();
  }, []);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay, tick]);
}
