"use client";

import { useState, useEffect } from "react";

interface TextSelection {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useTextSelection(): TextSelection {
  const [selection, setSelection] = useState<TextSelection>({
    text: "",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setSelection({ text: "", x: 0, y: 0, width: 0, height: 0 });
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelection({
        text: sel.toString(),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    };

    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, []);

  return selection;
}
