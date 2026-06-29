"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface RetentionCurvesChartProps {
  retentionData: Array<{
    cohort: string;
    retention1: number;
    retention7: number;
    retention30: number;
    retention90: number;
  }>;
  weeklyTrend: Array<{
    week: string;
    activeStudents: number;
    newStudents: number;
    returningStudents: number;
  }>;
}

export function RetentionCurvesChart({ retentionData, weeklyTrend }: RetentionCurvesChartProps) {
  const lineData = retentionData.map((d) => ({
    cohort: d.cohort,
    "1 день": d.retention1,
    "7 дней": d.retention7,
    "30 дней": d.retention30,
    "90 дней": d.retention90,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Кривые удержания по когортам</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="cohort" className="text-xs" />
              <YAxis domain={[0, 100]} className="text-xs" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="1 день" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="7 дней" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="30 дней" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="90 дней" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Еженедельный тренд активности</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="week" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="activeStudents" fill="hsl(var(--primary))" name="Активные" radius={[4, 4, 0, 0]} />
              <Bar dataKey="newStudents" fill="#10b981" name="Новые" radius={[4, 4, 0, 0]} />
              <Bar dataKey="returningStudents" fill="#f59e0b" name="Возвраты" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
