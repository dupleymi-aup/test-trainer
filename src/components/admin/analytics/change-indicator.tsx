import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface ChangeIndicatorProps {
  value: number;
  isPercentage?: boolean;
}

export function ChangeIndicator({ value, isPercentage = false }: ChangeIndicatorProps) {
  const isPositive = value >= 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const displayValue = isPositive ? `+${value}` : `${value}`;

  return (
    <span className={`inline-flex items-center gap-0.5 ${isPositive ? "text-green-600" : "text-red-600"}`}>
      <Icon className="h-3 w-3" />
      <span className="text-sm font-medium">
        {displayValue}{isPercentage ? "%" : " п.п."}
      </span>
    </span>
  );
}
