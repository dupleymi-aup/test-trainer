"use client";

import { PageError } from "@/components/page-error";

export default function StudentError({
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
      title="Ошибка в панели студента"
      description="Произошла непредвиденная ошибка. Попробуйте обновить страницу."
      logPrefix="StudentError"
    />
  );
}
