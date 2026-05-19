"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendIndicator } from "@/components/admin/analytics/trend-indicator";
import { Zap } from "lucide-react";

interface VelocityData {
  studentVelocity: { studentId: string; name: string; group: string | null; attemptsPerWeek: number; totalAttempts: number; weeksActive: number; avgScore: number; trend: "improving" | "stable" | "declining" }[];
  weeklyTrend: { week: string; attemptsCount: number; avgScore: number }[];
}

export default function VelocityPage() {
  const [data, setData] = useState<VelocityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics/velocity")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }).then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center text-rose-600">Нет данных</div></AdminLayout>;

  const avgVelocity = data.studentVelocity.length > 0
    ? Math.round(data.studentVelocity.reduce((s, v) => s + v.attemptsPerWeek, 0) / data.studentVelocity.length * 10) / 10
    : 0;
  const improving = data.studentVelocity.filter((v) => v.trend === "improving").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Скорость обучения</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Студентов</div><div className="text-2xl font-bold">{data.studentVelocity.length}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-1 text-xs text-muted-foreground"><Zap className="h-3 w-3" /> Ср. скорость</div><div className="text-2xl font-bold">{avgVelocity}/нед</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Улучшают</div><div className="text-2xl font-bold text-emerald-600">{improving}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Макс. скорость</div><div className="text-2xl font-bold">{Math.max(...data.studentVelocity.map((v) => v.attemptsPerWeek), 0)}/нед</div></CardContent></Card>
        </div>

        {/* Weekly trend chart */}
        {data.weeklyTrend.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Активность по неделям</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="attemptsCount" fill="hsl(var(--primary))" name="Попытки" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgScore" fill="#10b981" name="Ср. балл" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Student velocity table */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Скорость по студентам</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Студент</TableHead><TableHead>Группа</TableHead><TableHead className="text-right">Попыток/нед</TableHead><TableHead className="text-right">Всего попыток</TableHead><TableHead className="text-right">Недель</TableHead><TableHead className="text-right">Ср. балл</TableHead><TableHead className="text-right">Тренд</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.studentVelocity.map((v) => (
                  <TableRow key={v.studentId}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="text-sm">{v.group || "—"}</TableCell>
                    <TableCell className="text-right font-bold">{v.attemptsPerWeek}</TableCell>
                    <TableCell className="text-right">{v.totalAttempts}</TableCell>
                    <TableCell className="text-right">{v.weeksActive}</TableCell>
                    <TableCell className="text-right"><Badge variant={v.avgScore >= 75 ? "default" : v.avgScore >= 50 ? "secondary" : "destructive"}>{v.avgScore}%</Badge></TableCell>
                    <TableCell className="text-right"><TrendIndicator trend={v.trend} compact /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
