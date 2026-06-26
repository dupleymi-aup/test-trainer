"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ isLoading = false, loadingText, children, disabled, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(isLoading && "pointer-events-none", className)}
        {...props}
      >
        {isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {isLoading ? loadingText || children : children}
      </Button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";
