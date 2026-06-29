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
  LineChart,
  Line,
  Legend,
} from "recharts";

interface ErrorPatternsChartProps {
  perTaskErrors: Array<{
    taskName: string;
    errorRate: number;
    avgScore: number;
    attemptsCount: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    totalErrors: number;
    errorRate: number;
  }>;
}

export function ErrorPatternsChart({ perTaskErrors, monthlyTrend }: ErrorPatternsChartProps) {
  const barData = perTaskErrors.slice(0, 10).map((t) => ({
    name: t.taskName.length > 20 ? t.taskName.slice(0, 20) + "..." : t.taskName,
    errorRate: t.errorRate,
    avgScore: t.avgScore,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Частота ошибок по заданиям (top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" domain={[0, 100]} className="text-xs" />
              <YAxis type="category" dataKey="name" className="text-xs" width={120} />
              <Tooltip />
              <Bar dataKey="errorRate" fill="#ef4444" name="Частота ошибок %" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Тренд ошибок по месяцам</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="totalErrors" stroke="#ef4444" name="Всего ошибок" strokeWidth={2} />
              <Line type="monotone" dataKey="errorRate" stroke="#f59e0b" name="Доля ошибок %" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
