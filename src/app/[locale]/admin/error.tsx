"use client";

import { PageError } from "@/components/page-error";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageError
      error={error}
      reset={reset}
      title="Admin panel error"
      description="An unexpected error occurred. Please try refreshing the page."
      logPrefix="AdminError"
    />
  );
}
