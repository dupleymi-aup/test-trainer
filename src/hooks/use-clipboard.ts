"use client";

import { useState, useCallback, useRef } from "react";

interface UseClipboardReturn {
  copied: boolean;
  copy: (text: string) => Promise<void>;
  error: Error | null;
}

export function useClipboard(timeout = 2000): UseClipboardReturn {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(null);

      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), timeout);
    } catch (err) {
      setCopied(false);
      setError(err instanceof Error ? err : new Error("Copy failed"));
    }
  }, [timeout]);

  return { copied, copy, error };
}
