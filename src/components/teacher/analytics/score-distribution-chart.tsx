"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ScoreDistributionChartProps {
  data: Array<{ range: string; count: number }>;
}

const rangeColors: Record<string, string> = {
  "0-20": "hsl(var(--rose-500, 346 83% 51%))",
  "21-40": "hsl(var(--amber-500, 38 92% 50%))",
  "41-60": "hsl(var(--yellow-500, 48 96% 53%))",
  "61-80": "hsl(var(--lime-500, 84 81% 46%))",
  "81-100": "hsl(var(--emerald-500, 160 84% 39%))",
};

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Распределение баллов</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="range" className="text-xs" />
            <YAxis allowDecimals={false} className="text-xs" />
            <Tooltip
              formatter={(value: number) => [
                `${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
                "Количество",
              ]}
            />
            <Bar
              dataKey="count"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => (
                <Bar
                  key={`bar-${index}`}
                  dataKey="count"
                  fill={rangeColors[entry.range] || "hsl(var(--primary))"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
