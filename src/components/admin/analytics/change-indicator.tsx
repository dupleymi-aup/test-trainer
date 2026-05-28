import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface ChangeIndicatorProps {
  value: number;
  isPercentage?: boolean;
  isPoints?: boolean;
}

export function ChangeIndicator({ value, isPercentage = false, isPoints = false }: ChangeIndicatorProps) {
  const suffix = isPoints ? " пп" : isPercentage ? "%" : " п.п.";

  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span className="text-sm font-medium">0{suffix}</span>
      </span>
    );
  }

  const isPositive = value > 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const displayValue = isPositive ? `+${value}` : `${value}`;

  return (
    <span className={`inline-flex items-center gap-0.5 ${isPositive ? "text-green-600" : "text-red-600"}`}>
      <Icon className="h-3 w-3" />
      <span className="text-sm font-medium">
        {displayValue}{suffix}
      </span>
    </span>
  );
}
