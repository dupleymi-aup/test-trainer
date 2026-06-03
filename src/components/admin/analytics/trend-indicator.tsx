import { ArrowUpRight, ArrowDownRight, Minus, HelpCircle } from "lucide-react";

interface TrendIndicatorProps {
  trend: "improving" | "stable" | "declining" | "none";
  compact?: boolean;
}

const trendConfig = {
  improving: {
    icon: ArrowUpRight,
    label: "Растёт",
    className: "text-green-600 dark:text-green-400",
  },
  stable: {
    icon: Minus,
    label: "Стабильно",
    className: "text-yellow-600 dark:text-yellow-400",
  },
  declining: {
    icon: ArrowDownRight,
    label: "Снижается",
    className: "text-red-600 dark:text-red-400",
  },
  none: {
    icon: HelpCircle,
    label: "Нет данных",
    className: "text-gray-400 dark:text-gray-500",
  },
};

export function TrendIndicator({ trend, compact = false }: TrendIndicatorProps) {
  const { icon: Icon, label, className } = trendConfig[trend];

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Icon className={compact ? "h-3 w-3" : "h-4 w-4"} />
      {!compact && <span className="text-sm">{label}</span>}
    </span>
  );
}
