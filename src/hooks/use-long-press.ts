"use client";

import { useCallback, useRef } from "react";

interface UseLongPressOptions {
  delay?: number;
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void;
  onRelease?: (e: React.MouseEvent | React.TouchEvent) => void;
}

interface UseLongPressReturn {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export function useLongPress({
  delay = 500,
  onLongPress,
  onRelease,
}: UseLongPressOptions): UseLongPressReturn {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;
  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      isLongPressRef.current = false;
      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPressRef.current(e);
      }, delay);
    },
    [delay]
  );

  const stop = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (!isLongPressRef.current) {
        onReleaseRef.current?.(e);
      }
    },
    []
  );

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}
