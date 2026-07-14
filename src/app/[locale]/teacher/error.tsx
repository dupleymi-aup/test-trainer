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
      title="Ошибка в панели преподавателя"
      description="Произошла непредвиденная ошибка. Попробуйте обновить страницу."
      logPrefix="TeacherError"
    />
  );
}
