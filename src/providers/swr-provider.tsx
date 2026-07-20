"use client";

import type { SWRConfiguration } from "swr";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";

interface SWRProviderProps {
  children: ReactNode;
  config?: SWRConfiguration;
}

/**
 * SWR Provider - wraps the entire app with SWR configuration
 * Must be used in a client component
 */
export function SWRProvider({ children, config }: SWRProviderProps) {
  return (
    <SWRConfig value={config}>
      {children}
    </SWRConfig>
  );
}
