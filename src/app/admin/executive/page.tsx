"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DonutChart } from "@/components/admin/charts/donut-chart";
import { ComposedChart } from "@/components/admin/charts/composed-chart";
import { PrintButton } from "@/components/admin/analytics/print-button";
import {
  Users,
  GraduationCap,
  FolderKanban,
  FileText,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

interface ExecutiveData {
  kpi: {
    totalStudents: number;
    totalTeachers: number;
    totalGroups: number;
    totalAttempts: number;
    avgScore: number;
    activeStudents30d: number;
    activeRate: number;
  };
  roleDistribution: Array<{ role: string; count: number }>;
  riskBreakdown: { noRisk: number; lowRisk: number; mediumRisk: number; highRisk: number; total: number };
  topRiskStudents: Array<{
    id: string; name: string; group: string; university: string;
    riskScore: number; dropoutRisk: string; avgScore: number; trend: string;
  }>;
  activityTrend: Array<{ label: string; attempts: number; avgScore: number }>;
  topGroups: Array<{ groupId: string; name: string; avgScore: number; studentCount: number }>;
}

const roleLabels: Record<string, string> = { STUDENT: "Студенты", TEACHER: "Преподаватели", ADMIN: "Администраторы" };

export default function ExecutivePage() {
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/executive")
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : "Unknown error"); setLoading(false); });
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error) return <AdminLayout><div className="p-8 text-center"><p className="text-destructive">Ошибка: {error}</p></div></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Нет данных</div></AdminLayout>;

  const { kpi, roleDistribution, riskBreakdown, topRiskStudents, activityTrend, topGroups } = data;

  const riskColors = ["#10b981", "#f59e0b", "#f97316", "#ef4444"];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Обзор платформы</h1>
            <p className="text-muted-foreground text-sm mt-1">Ключевые метрики и аналитика успеваемости</p>
          </div>
          <PrintButton />
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {[
            { label: "Студенты", value: kpi.totalStudents, icon: Users, color: "text-blue-600" },
            { label: "Преподаватели", value: kpi.totalTeachers, icon: GraduationCap, color: "text-amber-600" },
            { label: "Группы", value: kpi.totalGroups, icon: FolderKanban, color: "text-purple-600" },
            { label: "Попытки", value: kpi.totalAttempts, icon: FileText, color: "text-emerald-600" },
            { label: "Ср. балл", value: `${kpi.avgScore}%`, icon: TrendingUp, color: "text-cyan-600" },
            { label: "Активные 30д", value: kpi.activeStudents30d, icon: Users, color: "text-teal-600" },
            { label: "Активность", value: `${kpi.activeRate}%`, icon: TrendingUp, color: "text-violet-600" },
          ].map((card) => (
            <Card key={card.label}>
              <CardContent className="pt-4">
                <card.icon className={`h-5 w-5 ${card.color} mb-2`} />
                <p className="text-xl font-bold">{card.value}</p>
                <p className="text-[10px] text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Role distribution donut */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Распределение по ролям</CardTitle></CardHeader>
            <CardContent>
              <DonutChart
                data={roleDistribution.map((r, i) => ({
                  name: roleLabels[r.role] || r.role,
                  value: r.count,
                  color: ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"][i],
                }))}
                centerLabel="Всего"
                centerValue={kpi.totalStudents + kpi.totalTeachers + roleDistribution.find(r => r.role === "ADMIN")?.count}
              />
            </CardContent>
          </Card>

          {/* Risk breakdown donut */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Уровень риска</CardTitle></CardHeader>
            <CardContent>
              <DonutChart
                data={[
                  { name: "Без риска", value: riskBreakdown.noRisk, color: riskColors[0] },
                  { name: "Низкий", value: riskBreakdown.lowRisk, color: riskColors[1] },
                  { name: "Средний", value: riskBreakdown.mediumRisk, color: riskColors[2] },
                  { name: "Высокий", value: riskBreakdown.highRisk, color: riskColors[3] },
                ]}
                centerLabel="В зоне риска"
                centerValue={riskBreakdown.mediumRisk + riskBreakdown.highRisk}
              />
            </CardContent>
          </Card>

          {/* Top groups */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Топ группы</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topGroups.map((g, i) => (
                  <div key={g.groupId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                      <span className="text-sm font-medium">{g.name}</span>
                      <span className="text-xs text-muted-foreground">({g.studentCount})</span>
                    </div>
                    <Badge variant={g.avgScore >= 75 ? "default" : g.avgScore >= 50 ? "secondary" : "destructive"}>
                      {g.avgScore}%
                    </Badge>
                  </div>
                ))}
                {topGroups.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Нет данных</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Composed chart */}
        {activityTrend.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Активность за 30 дней</CardTitle></CardHeader>
            <CardContent>
              <ComposedChart
                data={activityTrend}
                barDataKey="attempts"
                lineDataKey="avgScore"
                height={250}
              />
            </CardContent>
          </Card>
        )}

        {/* Top risk students */}
        {topRiskStudents.length > 0 && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Студенты с наибольшим риском
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Студент</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Группа</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">Ср. балл</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">Тренд</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">Риск</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRiskStudents.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium">{s.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{s.group}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={s.avgScore >= 75 ? "default" : s.avgScore >= 50 ? "secondary" : "destructive"}>
                            {s.avgScore}%
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={s.trend === "improving" ? "text-emerald-600" : s.trend === "declining" ? "text-rose-600" : "text-muted-foreground"}>
                            {s.trend === "improving" ? "↑" : s.trend === "declining" ? "↓" : "→"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={s.dropoutRisk === "high" ? "destructive" : "secondary"}>
                            {s.dropoutRisk === "high" ? "Высокий" : "Средний"}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Link href={`/admin/analytics/student/${s.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 text-xs">
                              Подробнее <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
