"use client";

import { useState, useCallback } from "react";

interface UseMapReturn<K, V> {
  map: Map<K, V>;
  set: (key: K, value: V) => void;
  remove: (key: K) => void;
  clear: () => void;
  get: (key: K) => V | undefined;
  has: (key: K) => boolean;
}

export function useMap<K, V>(initialEntries?: [K, V][]): UseMapReturn<K, V> {
  const [map, setMap] = useState(() => new Map<K, V>(initialEntries));

  const set = useCallback((key: K, value: V) => {
    setMap((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  }, []);

  const remove = useCallback((key: K) => {
    setMap((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setMap(new Map());
  }, []);

  const get = useCallback((key: K) => map.get(key), [map]);

  const has = useCallback((key: K) => map.has(key), [map]);

  return { map, set, remove, clear, get, has };
}
