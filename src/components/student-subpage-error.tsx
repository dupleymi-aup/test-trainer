"use client";

import React from "react";
import { SubpageError } from "@/components/subpage-error";

export function StudentSubpageError({
  error,
  reset,
  pageName,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  pageName: string;
}) {
  return <SubpageError error={error} reset={reset} pageName={pageName} role="student" />;
}
