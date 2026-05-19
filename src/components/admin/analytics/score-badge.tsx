"use client";

import { Badge } from "@/components/ui/badge";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const variant =
    score >= 75 ? "default" : score >= 50 ? "secondary" : "destructive";

  return (
    <Badge variant={variant} className={size === "sm" ? "text-xs" : ""}>
      {score}%
    </Badge>
  );
}
