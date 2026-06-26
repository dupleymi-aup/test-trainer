"use client";

import { useEffect, useRef } from "react";

export function useDocumentTitle(title: string, restoreOnUnmount = true) {
  const prevTitleRef = useRef<string | null>(null);

  useEffect(() => {
    prevTitleRef.current = document.title;
    document.title = title;

    if (restoreOnUnmount) {
      return () => {
        if (prevTitleRef.current !== null) {
          document.title = prevTitleRef.current;
        }
      };
    }
  }, [title, restoreOnUnmount]);
}
