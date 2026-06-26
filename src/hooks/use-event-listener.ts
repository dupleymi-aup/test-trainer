"use client";

import { useEffect, useRef, type RefObject } from "react";

type EventMap<T> = T extends Window
  ? WindowEventMap
  : T extends HTMLElement
    ? HTMLElementEventMap
    : Record<string, Event>;

export function useEventListener<
  T extends Window | HTMLElement,
  K extends keyof EventMap<T> & string,
>(
  eventName: K,
  handler: (event: EventMap<T>[K]) => void,
  element?: RefObject<T> | null,
  options?: boolean | AddEventListenerOptions
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const target = element?.current ?? window;
    if (!target?.addEventListener) return;

    const listener = (event: Event) => {
      savedHandler.current(event as EventMap<T>[K]);
    };

    target.addEventListener(eventName, listener, options);
    return () => target.removeEventListener(eventName, listener, options);
  }, [eventName, element, options]);
}
