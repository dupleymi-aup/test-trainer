"use client";

import { useCallback } from "react";

type RefCallback<T> = (instance: T | null) => void;
type RefObject<T> = { current: T | null };
type PossibleRef<T> = RefCallback<T> | RefObject<T> | null;

function setRef<T>(ref: PossibleRef<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref !== null) {
    (ref as RefObject<T>).current = value;
  }
}

export function useForkRef<T>(...refs: PossibleRef<T>[]): (node: T | null) => void {
  return useCallback(
    (node: T | null) => {
      refs.forEach((ref) => setRef(ref, node));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs
  );
}
