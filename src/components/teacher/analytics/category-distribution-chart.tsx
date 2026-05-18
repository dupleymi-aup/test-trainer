"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CategoryDistributionChartProps {
  data: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

const categoryColors: Record<string, string> = {
  "Нормальное значение": "hsl(var(--emerald-500, 160 84% 39%))",
  "Граничное значение": "hsl(var(--amber-500, 38 92% 50%))",
  Исключение: "hsl(var(--rose-500, 346 83% 51%))",
  "Недопустимый тип": "hsl(var(--purple-500, 262 83% 58%))",
};

export function CategoryDistributionChart({
  data,
}: CategoryDistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Распределение категорий тестов</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ category, percentage }) =>
                `${category}: ${percentage}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
              nameKey="category"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={categoryColors[entry.category] || "hsl(var(--primary))"}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                `${value} (${data.find((d) => d.count === value)?.percentage}%)`,
                "Количество",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        {total === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Нет данных о категориях
          </p>
        )}
      </CardContent>
    </Card>
  );
}
