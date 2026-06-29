"use client";

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

interface WeeklyActivityBarChartProps {
  data: Array<{
    week: string;
    activeStudents: number;
    attempts: number;
    avgScore: number;
    newStudents: number;
  }>;
}

export function WeeklyActivityBarChart({ data }: WeeklyActivityBarChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="week" className="text-xs" />
        <YAxis allowDecimals={false} className="text-xs" />
        <Tooltip />
        <Legend />
        <Bar dataKey="activeStudents" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Активные студенты" />
        <Bar dataKey="newStudents" fill="#22c55e" radius={[2, 2, 0, 0]} name="Новые студенты" />
      </BarChart>
    </ResponsiveContainer>
  );
}
