"use client";

export default function LoginError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold text-destructive">Ошибка входа</h2>
      <p className="text-sm text-muted-foreground">Произошла ошибка при загрузке страницы.</p>
      <button
        onClick={reset}
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Попробовать снова
      </button>
    </div>
  );
}
