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

interface TeacherActivityChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
}

export function TeacherActivityChart({ data }: TeacherActivityChartProps) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Активность преподавателей</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Bar dataKey="avgScore" fill="hsl(var(--primary))" name="Ср. балл" radius={[4, 4, 0, 0]} />
            <Bar dataKey="totalAttempts" fill="#10b981" name="Попытки" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
