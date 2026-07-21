"use client";

import { PageError } from "@/components/page-error";

export default function TeacherError({
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
      title="Teacher panel error"
      description="An unexpected error occurred. Please try refreshing the page."
      logPrefix="TeacherError"
    />
  );
}
