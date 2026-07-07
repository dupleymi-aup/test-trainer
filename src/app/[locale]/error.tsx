"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RootError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="h-14 w-14 text-destructive" />
      <div>
        <h1 className="text-2xl font-bold text-destructive">
          Что-то пошло не так
        </h1>
        <p className="mt-2 text-muted-foreground">
          Произошла критическая ошибка. Попробуйте обновить страницу.
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <pre className="mt-4 max-w-full overflow-auto rounded bg-muted p-4 text-left text-xs text-muted-foreground">
            {error.message}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          Попробовать снова
        </Button>
        <Button variant="destructive" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Обновить страницу
        </Button>
      </div>
    </div>
  );
}
