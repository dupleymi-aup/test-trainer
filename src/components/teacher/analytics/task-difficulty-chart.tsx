"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TaskDifficultyChartProps {
  data: Array<{
    taskId: string;
    taskName: string;
    difficulty: string;
    avgScore: number;
    attemptsCount: number;
  }>;
}

const difficultyColors: Record<string, string> = {
  Легко: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  Средне: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Сложно: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

export function TaskDifficultyChart({ data }: TaskDifficultyChartProps) {
  const chartData = data.map((d) => ({
    taskId: d.taskId,
    taskName: d.taskName.length > 15 ? d.taskName.substring(0, 15) + "..." : d.taskName,
    avgScore: d.avgScore,
    attemptsCount: d.attemptsCount,
    difficulty: d.difficulty,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Сложность заданий</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="taskId" className="text-xs" />
            <YAxis yAxisId="left" domain={[0, 100]} className="text-xs" />
            <YAxis
              yAxisId="right"
              orientation="right"
              allowDecimals={false}
              className="text-xs"
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "avgScore") return [`${value}%`, "Средний балл"];
                return [value, "Попыток"];
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="avgScore"
              fill="hsl(var(--primary))"
              name="Средний балл"
              radius={[2, 2, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="attemptsCount"
              stroke="hsl(var(--chart-2, 173 58% 39%))"
              strokeWidth={2}
              name="Попыток"
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="flex flex-wrap gap-2 mt-4">
          {data.map((d) => (
            <div key={d.taskId} className="flex items-center gap-1">
              <span className="text-xs font-mono">{d.taskId}</span>
              <Badge
                variant="outline"
                className={difficultyColors[d.difficulty] || ""}
              >
                {d.difficulty}
              </Badge>
              <span className="text-xs text-muted-foreground">{d.avgScore}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
