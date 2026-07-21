"use client";

import { AdminSubpageError } from "@/components/subpage-error";

export default function ExportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AdminSubpageError error={error} reset={reset} pageName="Report Export" />;
}
