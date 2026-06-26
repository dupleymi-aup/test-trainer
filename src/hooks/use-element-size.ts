"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface ElementSize {
  width: number;
  height: number;
}

interface UseElementSizeReturn {
  ref: (node: Element | null) => void;
  width: number;
  height: number;
}

export function useElementSize(): UseElementSizeReturn {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: Element | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    if (!node) return;

    observerRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setSize({ width: Math.round(width), height: Math.round(height) });
      }
    });
    observerRef.current.observe(node);
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { ref, width: size.width, height: size.height };
}
