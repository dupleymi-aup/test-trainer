"use client";

import { useCallback, useRef } from "react";

interface UseDoubleClickOptions {
  delay?: number;
  onSingleClick?: (e: MouseEvent) => void;
  onDoubleClick: (e: MouseEvent) => void;
}

export function useDoubleClick({
  delay = 300,
  onSingleClick,
  onDoubleClick,
}: UseDoubleClickOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDoubleClickRef = useRef(onDoubleClick);
  onDoubleClickRef.current = onDoubleClick;
  const onSingleClickRef = useRef(onSingleClick);
  onSingleClickRef.current = onSingleClick;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        onDoubleClickRef.current(e.nativeEvent);
      } else {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          onSingleClickRef.current?.(e.nativeEvent);
        }, delay);
      }
    },
    [delay]
  );

  return handleClick;
}
