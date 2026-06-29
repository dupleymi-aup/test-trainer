"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CohortRetentionChartProps {
  data: Array<Record<string, string | number>>;
}

export function CohortRetentionChart({ data }: CohortRetentionChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="cohort" className="text-xs" />
        <YAxis allowDecimals={false} className="text-xs" />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="Регистрация" stroke="hsl(var(--primary))" strokeWidth={2} />
        <Line type="monotone" dataKey="День 1" stroke="#22c55e" strokeWidth={2} />
        <Line type="monotone" dataKey="День 7" stroke="#eab308" strokeWidth={2} />
        <Line type="monotone" dataKey="День 30" stroke="#f97316" strokeWidth={2} />
        <Line type="monotone" dataKey="День 90" stroke="#ef4444" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
