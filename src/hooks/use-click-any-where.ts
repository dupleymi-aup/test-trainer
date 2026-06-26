"use client";

import { useEffect, useRef } from "react";

export function useClickAnyWhere(handler: (e: MouseEvent | TouchEvent) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = (e: MouseEvent | TouchEvent) => {
      handlerRef.current(e);
    };
    document.addEventListener("click", listener);
    return () => {
      document.removeEventListener("click", listener);
    };
  }, []);
}
