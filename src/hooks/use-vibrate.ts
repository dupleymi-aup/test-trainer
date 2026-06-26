"use client";

import { useCallback } from "react";

export function useVibrate() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      return navigator.vibrate(pattern);
    }
    return false;
  }, []);

  const stop = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      return navigator.vibrate(0);
    }
    return false;
  }, []);

  return { vibrate, stop, isSupported: typeof navigator !== "undefined" && !!navigator.vibrate };
}
