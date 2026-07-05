"use client";

import { useState, useEffect, useRef } from "react";

interface UseIdleOptions {
  timeout?: number;
  events?: readonly string[];
}

const DEFAULT_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"] as const;

export function useIdle(options?: UseIdleOptions): boolean {
  const { timeout = 60 * 1000, events = DEFAULT_EVENTS } = options || {};
  const [idle, setIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef(timeout);
  timeoutRef.current = timeout;
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    const reset = () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      setIdle(false);
      timerRef.current = setTimeout(() => setIdle(true), timeoutRef.current);
    };

    const currentEvents = eventsRef.current;
    currentEvents.forEach((event) => document.addEventListener(event, reset));
    reset();

    return () => {
      currentEvents.forEach((event) => document.removeEventListener(event, reset));
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return idle;
}
