"use client";

import { useState } from "react";

export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  if (!mounted && typeof window !== "undefined") {
    setMounted(true);
  }

  return mounted;
}
