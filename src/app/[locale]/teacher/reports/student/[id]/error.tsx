"use client";

import { TeacherSubpageError } from "@/components/teacher-subpage-error";

export default function StudentProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <TeacherSubpageError error={error} reset={reset} pageName="Профиль студента" />;
}
