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
  Legend,
} from "recharts";

interface WeeklyActivityChartProps {
  data: Array<{ week: string; attemptsCount: number; avgScore: number }>;
}

export function WeeklyActivityChart({ data }: WeeklyActivityChartProps) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Активность по неделям</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="week" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="attemptsCount"
              fill="hsl(var(--primary))"
              name="Попытки"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="avgScore"
              fill="#10b981"
              name="Ср. балл"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
