"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TimeTrendsChartProps {
  data: Array<{
    date: string;
    avgScore: number;
    avgEc: number;
    avgBv: number;
    attemptCount: number;
  }>;
}

export function TimeTrendsChart({ data }: TimeTrendsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Динамика результатов по месяцам</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis domain={[0, 100]} className="text-xs" />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "avgScore") return [`${value}%`, "Балл"];
                if (name === "avgEc") return [`${value}%`, "EC"];
                if (name === "avgBv") return [`${value}%`, "BV"];
                if (name === "attemptCount") return [value, "Попыток"];
                return [value, name];
              }}
            />
            <Legend />
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ecGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1, 12 76% 61%))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1, 12 76% 61%))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bvGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2, 173 58% 39%))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-2, 173 58% 39%))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="avgScore"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#scoreGradient)"
              name="Балл"
            />
            <Area
              type="monotone"
              dataKey="avgEc"
              stroke="hsl(var(--chart-1, 12 76% 61%))"
              strokeWidth={1.5}
              fill="url(#ecGradient)"
              name="EC"
              strokeDasharray="5 3"
            />
            <Area
              type="monotone"
              dataKey="avgBv"
              stroke="hsl(var(--chart-2, 173 58% 39%))"
              strokeWidth={1.5}
              fill="url(#bvGradient)"
              name="BV"
              strokeDasharray="5 3"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
