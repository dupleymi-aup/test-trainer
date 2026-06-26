"use client";

import { useEffect, useRef, useCallback } from "react";

export function useRafLoop(callback: (dt: number) => void, active = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const rafRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number | null>(null);

  const loop = useCallback((time: number) => {
    if (prevTimeRef.current !== null) {
      callbackRef.current(time - prevTimeRef.current);
    }
    prevTimeRef.current = time;
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    if (!active) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      prevTimeRef.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      prevTimeRef.current = null;
    };
  }, [active, loop]);
}
