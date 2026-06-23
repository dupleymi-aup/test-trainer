"use client";

import { TeacherSubpageError } from "@/components/teacher-subpage-error";

export default function GroupsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <TeacherSubpageError error={error} reset={reset} pageName="Группы" />;
}
