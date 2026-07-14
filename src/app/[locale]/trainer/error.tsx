"use client";

import { PageError } from "@/components/page-error";

export default function TrainerError({
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
      title="Ошибка загрузки тренажёра"
      description="Не удалось загрузить страницу. Попробуйте обновить."
      logPrefix="TrainerError"
      iconSize="sm"
      containerClassName=" bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/20"
    />
  );
}
