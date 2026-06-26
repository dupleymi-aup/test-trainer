"use client";

import { useEffect, useRef } from "react";

export function useUpdateEffect(effect: () => void | (() => void), deps: unknown[]) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
