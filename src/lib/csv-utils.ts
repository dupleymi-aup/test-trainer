/**
 * Shared CSV utility functions for admin and teacher report exports.
 *
 * sanitizeCSVValue — prevents CSV injection by escaping double quotes
 * and prefixing formula-triggering characters per RFC 4180.
 *
 * sanitizeFilename — sanitizes filenames for Content-Disposition headers,
 * removing unsafe characters and limiting length.
 */

export function sanitizeCSVValue(value: string): string {
  const escaped = value.replace(/"/g, '""');
  const trimmed = escaped.trimStart();
  if (
    trimmed.startsWith("=") ||
    trimmed.startsWith("+") ||
    trimmed.startsWith("-") ||
    trimmed.startsWith("@")
  ) {
    return "'" + escaped;
  }
  return escaped;
}

export function sanitizeFilename(name: string): string {
  const safe = name
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s_-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return safe || "unnamed";
}
