"use client";

import { useState, useEffect, useRef } from "react";

interface UseIdleOptions {
  timeout?: number;
  events?: string[];
}

export function useIdle(options?: UseIdleOptions): boolean {
  const { timeout = 60 * 1000, events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"] } = options || {};
  const [idle, setIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef(timeout);
  timeoutRef.current = timeout;

  useEffect(() => {
    const reset = () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      setIdle(false);
      timerRef.current = setTimeout(() => setIdle(true), timeoutRef.current);
    };

    events.forEach((event) => document.addEventListener(event, reset));
    reset();

    return () => {
      events.forEach((event) => document.removeEventListener(event, reset));
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.join(",")]);

  return idle;
}
