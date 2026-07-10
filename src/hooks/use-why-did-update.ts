"use client";

import { useEffect, useRef } from "react";
import { logger } from "@/lib/logger";

export function useWhyDidUpdate(name: string, props: Record<string, unknown>) {
  const prevProps = useRef<Record<string, unknown>>(props);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const allKeys = new Set([...Object.keys(prevProps.current), ...Object.keys(props)]);
    const changed: string[] = [];

    for (const key of allKeys) {
      const prev = prevProps.current[key];
      const next = props[key];
      if (!Object.is(prev, next)) {
        changed.push(key);
      }
    }

    if (changed.length > 0) {
      logger.debug(`[WhyDidUpdate:${name}]`, {
        changed,
        prev: changed.reduce((acc, k) => ({ ...acc, [k]: prevProps.current[k] }), {}),
        next: changed.reduce((acc, k) => ({ ...acc, [k]: props[k] }), {}),
      });
    }

    prevProps.current = props;
  }, [name, props]);
}
