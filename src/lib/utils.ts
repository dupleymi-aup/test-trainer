import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a user-input string into a typed JavaScript value.
 * Handles: booleans (EN/RU), null, undefined, numbers (incl. scientific notation), JSON objects/arrays.
 * Falls back to the trimmed string.
 */
export function parseInputValue(raw: string): unknown {
  const trimmed = raw.trim();

  if (trimmed === "null") return null;
  if (trimmed === "undefined") return undefined;
  if (trimmed === "true" || trimmed === "да" || trimmed === "верно") return true;
  if (trimmed === "false" || trimmed === "нет" || trimmed === "неверно") return false;

  const num = Number(trimmed);
  if (trimmed !== "" && !isNaN(num) && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
    return num;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" || Array.isArray(parsed)) return parsed;
  } catch {
    // Not JSON — fall through to string
  }

  return trimmed;
}
