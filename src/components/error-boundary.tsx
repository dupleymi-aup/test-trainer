"use client";

import * as React from "react";
import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("[ErrorBoundary] Uncaught error", { error: error.message, componentStack: errorInfo.componentStack });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold text-destructive">
              Что-то пошло не так
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Произошла непредвиденная ошибка. Попробуйте обновить страницу.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="mt-3 max-w-full overflow-auto rounded bg-muted p-3 text-left text-xs text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Попробовать снова
            </Button>
            <Button variant="destructive" size="sm" onClick={this.handleReset}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Обновить страницу
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
