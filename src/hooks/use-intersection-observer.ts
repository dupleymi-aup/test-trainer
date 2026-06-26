"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  triggerOnce?: boolean;
}

interface UseIntersectionObserverReturn {
  ref: (node: Element | null) => void;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

export function useIntersectionObserver(
  options?: UseIntersectionObserverOptions
): UseIntersectionObserverReturn {
  const { triggerOnce = false, threshold, rootMargin, root } = options || {};
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const hasTriggered = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: Element | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (!node || (triggerOnce && hasTriggered.current)) return;

      observerRef.current = new IntersectionObserver(([observedEntry]) => {
        setEntry(observedEntry);
        setIsIntersecting(observedEntry.isIntersecting);
        if (observedEntry.isIntersecting) hasTriggered.current = true;
      }, { threshold, rootMargin, root });

      observerRef.current.observe(node);
    },
    [triggerOnce, threshold, rootMargin, root]
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { ref, isIntersecting, entry };
}
