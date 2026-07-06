"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";

interface SubpageErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  pageName: string;
  role: "student" | "teacher" | "admin";
}

export function SubpageError({ error, reset, pageName, role }: SubpageErrorProps) {
  useEffect(() => {
    const roleLabel = role === "admin" ? "AdminError" : role === "teacher" ? "TeacherError" : "StudentError";
    logger.error(`[${roleLabel}:${pageName}]`, { error: error.message });
  }, [error, pageName, role]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div>
        <h3 className="text-lg font-semibold text-destructive">
          Error loading: {pageName}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Failed to load data. Please try refreshing the page.
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <pre className="mt-3 max-w-full overflow-auto rounded bg-muted p-3 text-left text-xs text-muted-foreground">
            {error.message}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={reset}>
          Try again
        </Button>
        <Button variant="destructive" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Reload page
        </Button>
      </div>
    </div>
  );
}

export function AdminSubpageError(props: Omit<SubpageErrorProps, "role">) {
  return <SubpageError {...props} role="admin" />;
}
