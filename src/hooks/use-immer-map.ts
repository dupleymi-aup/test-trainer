"use client";

import { useState, useCallback, useRef } from "react";

interface UseImmerMapReturn<K, V> {
  map: Map<K, V>;
  set: (key: K, value: V) => void;
  update: (key: K, recipe: (current: V) => V) => void;
  remove: (key: K) => void;
  clear: () => void;
  get: (key: K) => V | undefined;
  has: (key: K) => boolean;
}

export function useImmerMap<K, V>(initialEntries?: [K, V][]): UseImmerMapReturn<K, V> {
  const [map, setMap] = useState(() => new Map<K, V>(initialEntries));
  const mapRef = useRef(map);
  mapRef.current = map;

  const set = useCallback((key: K, value: V) => {
    setMap((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  }, []);

  const update = useCallback((key: K, recipe: (current: V) => V) => {
    setMap((prev) => {
      const next = new Map(prev);
      const current = next.get(key);
      if (current !== undefined) {
        next.set(key, recipe(current));
      }
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

  const get = useCallback((key: K) => mapRef.current.get(key), []);
  const has = useCallback((key: K) => mapRef.current.has(key), []);

  return { map, set, update, remove, clear, get, has };
}
