"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("[ProfileError]", { error: error.message });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/20 p-8 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div>
        <h3 className="text-lg font-semibold text-destructive">
          Ошибка загрузки профиля
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Не удалось загрузить страницу. Попробуйте обновить.
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <pre className="mt-3 max-w-full overflow-auto rounded bg-muted p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={reset}>
          Попробовать снова
        </Button>
        <Button variant="destructive" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Обновить страницу
        </Button>
      </div>
    </div>
  );
}
