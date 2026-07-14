"use client";

import { PageError } from "@/components/page-error";

export default function AdminError({
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
      title="Ошибка в панели администратора"
      description="Произошла непредвиденная ошибка. Попробуйте обновить страницу."
      logPrefix="AdminError"
    />
  );
}
