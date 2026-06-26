"use client";

import { useState, useEffect, useRef } from "react";

export function useThrottle<T>(value: T, interval = 300): T {
  const [throttled, setThrottled] = useState(value);
  const lastExec = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeUntilNext = interval - (now - lastExec.current);

    if (timeUntilNext <= 0) {
      lastExec.current = now;
      setThrottled(value);
    } else {
      const timer = setTimeout(() => {
        lastExec.current = Date.now();
        setThrottled(value);
      }, timeUntilNext);
      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttled;
}
