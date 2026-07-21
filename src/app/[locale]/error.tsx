"use client";

import { PageError } from "@/components/page-error";

export default function RootError({
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
      title="Something went wrong"
      description="A critical error occurred. Please try refreshing the page."
      logPrefix="RootError"
      iconSize="lg"
    />
  );
}
