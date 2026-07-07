"use client";

import { TeacherSubpageError } from "@/components/teacher-subpage-error";

export default function CompletionMatrixError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <TeacherSubpageError error={error} reset={reset} pageName="Матрица выполнения" />;
}
