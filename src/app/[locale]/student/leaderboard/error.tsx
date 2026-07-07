"use client";

import { StudentSubpageError } from "@/components/student-subpage-error";

export default function LeaderboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <StudentSubpageError error={error} reset={reset} pageName="Таблица лидеров" />;
}
