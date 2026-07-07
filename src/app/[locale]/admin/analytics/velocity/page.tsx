"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import dynamic from "next/dynamic";
import { TrendIndicator } from "@/components/admin/analytics/trend-indicator";
import { Zap } from "lucide-react";

const WeeklyActivityChart = dynamic(
  () => import("@/components/admin/analytics/charts/weekly-activity-chart").then((m) => m.WeeklyActivityChart),
  { ssr: false, loading: () => <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Загрузка графика...</CardContent></Card> }
);

interface VelocityData {
  studentVelocity: { studentId: string; name: string; group: string | null; attemptsPerWeek: number; totalAttempts: number; weeksActive: number; avgScore: number; trend: "improving" | "stable" | "declining" }[];
  weeklyTrend: { week: string; attemptsCount: number; avgScore: number }[];
}

export default function VelocityPage() {
  const [data, setData] = useState<VelocityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetch("/api/admin/analytics/velocity", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }).then((d) => { setData(d); setLoading(false); })
      .catch((e) => { if (controller.signal.aborted) return; setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
    return () => controller.abort();
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center text-rose-600">Нет данных</div></AdminLayout>;

  const avgVelocity = data.studentVelocity.length > 0
    ? Math.round(data.studentVelocity.reduce((s, v) => s + v.attemptsPerWeek, 0) / data.studentVelocity.length * 10) / 10
    : 0;
  const improving = data.studentVelocity.filter((v) => v.trend === "improving").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Скорость обучения</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Студентов</div><div className="text-2xl font-bold">{data.studentVelocity.length}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-1 text-xs text-muted-foreground"><Zap className="h-3 w-3" /> Ср. скорость</div><div className="text-2xl font-bold">{avgVelocity}/нед</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Улучшают</div><div className="text-2xl font-bold text-emerald-600">{improving}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Макс. скорость</div><div className="text-2xl font-bold">{data.studentVelocity.reduce((max, v) => Math.max(max, v.attemptsPerWeek), 0)}/нед</div></CardContent></Card>
        </div>

        {/* Weekly trend chart */}
        <WeeklyActivityChart data={data.weeklyTrend} />

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
