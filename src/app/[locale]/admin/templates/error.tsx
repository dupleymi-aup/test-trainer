"use client";

import { AdminSubpageError } from "@/components/subpage-error";

export default function TemplatesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AdminSubpageError error={error} reset={reset} pageName="Шаблоны" />;
}
