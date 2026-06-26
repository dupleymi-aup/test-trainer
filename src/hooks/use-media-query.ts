"use client";

import { useState, useEffect } from "react";

interface UseMediaQueryOptions {
  /** Value used during SSR/initial render before window.matchMedia runs */
  fallback?: boolean;
}

export function useMediaQuery(query: string, options?: UseMediaQueryOptions): boolean {
  const { fallback = false } = options || {};

  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return fallback;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
