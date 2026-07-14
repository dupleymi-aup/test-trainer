"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";

interface PageErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  description: string;
  logPrefix: string;
  iconSize?: "sm" | "md" | "lg";
  containerClassName?: string;
}

export function PageError({
  error,
  reset,
  title,
  description,
  logPrefix,
  iconSize = "md",
  containerClassName,
}: PageErrorProps) {
  useEffect(() => {
    logger.error(`[${logPrefix}]`, { error: error.message, digest: error.digest });
  }, [error, logPrefix]);

  const iconSizes = { sm: "h-10 w-10", md: "h-12 w-12", lg: "h-14 w-14" };
  const headingSizes = { sm: "text-lg", md: "text-xl", lg: "text-2xl" };

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center${containerClassName ? ` ${containerClassName}` : ""}`}>
      <AlertTriangle className={`${iconSizes[iconSize]} text-destructive`} />
      <div>
        <h1 className={`${headingSizes[iconSize]} font-bold text-destructive`}>
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {description}
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
