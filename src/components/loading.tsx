import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function LoadingSpinner({
  className,
  size = "md",
  text,
}: LoadingSpinnerProps) {
  const sizeMap = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-12 w-12" };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className
      )}
    >
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeMap[size])} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export function LoadingSkeleton({
  className,
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn("animate-pulse space-y-3", className)} role="status" aria-label="Загрузка...">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 rounded bg-muted",
            i === lines - 1 ? "w-4/5" : "w-full"
          )}
        />
      ))}
    </div>
  );
}
