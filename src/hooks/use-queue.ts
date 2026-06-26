"use client";

import { useState, useCallback } from "react";

interface UseQueueReturn<T> {
  queue: T[];
  enqueue: (...items: T[]) => void;
  dequeue: () => T | undefined;
  peek: () => T | undefined;
  clear: () => void;
  size: number;
}

export function useQueue<T>(initialItems?: T[]): UseQueueReturn<T> {
  const [queue, setQueue] = useState<T[]>(initialItems ?? []);

  const enqueue = useCallback((...items: T[]) => {
    setQueue((prev) => [...prev, ...items]);
  }, []);

  const dequeue = useCallback(() => {
    let dequeued: T | undefined;
    setQueue((prev) => {
      const [first, ...rest] = prev;
      dequeued = first;
      return rest;
    });
    return dequeued;
  }, []);

  const peek = useCallback(() => {
    return queue[0];
  }, [queue]);

  const clear = useCallback(() => {
    setQueue([]);
  }, []);

  return {
    queue,
    enqueue,
    dequeue,
    peek,
    clear,
    size: queue.length,
  };
}
