import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SummaryStatsCardsProps {
  stats: {
    totalAttempts: number;
    avgScore: number;
    avgEc: number;
    avgBv: number;
    avgCorrectness: number;
    avgTimeSpent: number;
  };
}

export function SummaryStatsCards({ stats }: SummaryStatsCardsProps) {
  const cards = [
    {
      label: "Всего попыток",
      value: stats.totalAttempts,
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      label: "Средний балл",
      value: `${stats.avgScore}%`,
      icon: stats.avgScore >= 75 ? TrendingUp : stats.avgScore >= 50 ? Minus : TrendingDown,
      color: stats.avgScore >= 75 ? "text-emerald-600" : stats.avgScore >= 50 ? "text-amber-600" : "text-rose-600",
    },
    {
      label: "Ср. покрытие EC",
      value: `${stats.avgEc}%`,
      icon: stats.avgEc >= 75 ? TrendingUp : stats.avgEc >= 50 ? Minus : TrendingDown,
      color: "text-purple-600",
    },
    {
      label: "Ср. покрытие BV",
      value: `${stats.avgBv}%`,
      icon: stats.avgBv >= 75 ? TrendingUp : stats.avgBv >= 50 ? Minus : TrendingDown,
      color: "text-cyan-600",
    },
    {
      label: "Ср. корректность",
      value: `${stats.avgCorrectness}%`,
      icon: stats.avgCorrectness >= 75 ? TrendingUp : stats.avgCorrectness >= 50 ? Minus : TrendingDown,
      color: "text-indigo-600",
    },
    {
      label: "Ср. время (сек)",
      value: stats.avgTimeSpent,
      icon: Minus,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
