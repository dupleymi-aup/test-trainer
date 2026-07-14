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
      title="Что-то пошло не так"
      description="Произошла критическая ошибка. Попробуйте обновить страницу."
      logPrefix="RootError"
      iconSize="lg"
    />
  );
}
