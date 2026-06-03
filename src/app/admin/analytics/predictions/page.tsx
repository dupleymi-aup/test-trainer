"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  AlertTriangle,
  TrendingDown,
  Clock,
  Users,
  BookOpen,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { AnalyticsFilterBar, FilterState } from "@/components/admin/analytics/analytics-filter-bar";
import { ScoreBadge } from "@/components/admin/analytics/score-badge";

const riskFactorConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  low_performer: { label: "Низкая успеваемость", color: "bg-rose-100 text-rose-800 border-rose-200", icon: <TrendingDown className="h-3 w-3" /> },
  declining: { label: "Снижение прогресса", color: "bg-amber-100 text-amber-800 border-amber-200", icon: <TrendingDown className="h-3 w-3" /> },
  inactive: { label: "Неактивность", color: "bg-orange-100 text-orange-800 border-orange-200", icon: <Clock className="h-3 w-3" /> },
  low_engagement: { label: "Низкая вовлечённость", color: "bg-blue-100 text-blue-800 border-blue-200", icon: <Users className="h-3 w-3" /> },
  poor_ec_coverage: { label: "Плохое покрытие EC", color: "bg-purple-100 text-purple-800 border-purple-200", icon: <BookOpen className="h-3 w-3" /> },
  poor_bv_coverage: { label: "Плохое покрытие BV", color: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: <BookOpen className="h-3 w-3" /> },
};

const dropoutRiskConfig: Record<string, { label: string; color: string }> = {
  high: { label: "Высокий", color: "bg-rose-600 text-white dark:bg-rose-700" },
  medium: { label: "Средний", color: "bg-amber-500 text-white dark:bg-amber-600" },
  low: { label: "Низкий", color: "bg-green-500 text-white dark:bg-green-600" },
};

interface PredictionsData {
  atRiskStudents: Array<{
    student: { id: string; name: string; email: string; group: string; university: string };
    riskFactors: string[];
    stats: { bestScore: number; avgScore: number; avgEc: number; avgBv: number; lastAttemptDate: string | null; attemptsCount: number; trend: string };
    recommendations: string[];
    dropoutRisk: string;
  }>;
  totalAtRisk: number;
  systemInsights: {
    tasksByFailRate: Array<{ taskId: string; taskName: string; failRate: number; avgScore: number; topics: string[] }>;
    weakTopics: Array<{ topic: string; avgScore: number }>;
    groupRecommendations: Array<{ groupId: string; groupName: string; avgScore: number; atRiskStudents: number; recommendation: string | null }>;
  };
}

export default function PredictionsPage() {
  const [data, setData] = useState<PredictionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);
    if (filters?.groupId) params.set("groupId", filters.groupId);
    if (filters?.university) params.set("university", filters.university);
    const qs = params.toString();
    fetch(`/api/admin/analytics/predictions${qs ? `?${qs}` : ""}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, [filters]);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки данных</div></AdminLayout>;


  const riskChartData = [
    { factor: "Низкая успеваемость", count: data.atRiskStudents.filter((s) => s.riskFactors.includes("low_performer")).length },
    { factor: "Снижение прогресса", count: data.atRiskStudents.filter((s) => s.riskFactors.includes("declining")).length },
    { factor: "Неактивность", count: data.atRiskStudents.filter((s) => s.riskFactors.includes("inactive")).length },
    { factor: "Низкая вовлечённость", count: data.atRiskStudents.filter((s) => s.riskFactors.includes("low_engagement")).length },
    { factor: "Плохое EC", count: data.atRiskStudents.filter((s) => s.riskFactors.includes("poor_ec_coverage")).length },
    { factor: "Плохое BV", count: data.atRiskStudents.filter((s) => s.riskFactors.includes("poor_bv_coverage")).length },
  ];

  const highRisk = data.atRiskStudents.filter((s) => s.dropoutRisk === "high").length;
  const mediumRisk = data.atRiskStudents.filter((s) => s.dropoutRisk === "medium").length;
  const lowRisk = data.atRiskStudents.filter((s) => s.dropoutRisk === "low").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Прогнозы и рекомендации</h1>
          <Link href="/admin/analytics" className="text-sm text-muted-foreground hover:text-foreground">
            Все отчёты <ArrowRight className="inline h-3 w-3 ml-1" />
          </Link>
        </div>

        <AnalyticsFilterBar onFilterChange={setFilters} showGroupFilter showUniversityFilter />

        {/* Risk Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-rose-600" /><span className="text-xs text-muted-foreground">Всего рисков</span></div>
              <p className="text-2xl font-bold">{data.totalAtRisk}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><AlertCircle className="h-4 w-4 text-rose-600" /><span className="text-xs text-muted-foreground">Высокий риск</span></div>
              <p className="text-2xl font-bold text-rose-600">{highRisk}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" /><span className="text-xs text-muted-foreground">Средний риск</span></div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{mediumRisk}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">Низкий риск</span></div>
              <p className="text-2xl font-bold text-green-600">{lowRisk}</p>
            </CardContent>
          </Card>
        </div>

        {/* Risk Distribution Chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Распределение факторов риска</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={riskChartData.filter((d) => d.count > 0)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="factor" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Студенты" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* At-Risk Students Table */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Студенты с рисками</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Студент</TableHead><TableHead>Группа</TableHead><TableHead className="text-right">Ср. балл</TableHead><TableHead className="text-right">Попытки</TableHead><TableHead>Факторы риска</TableHead><TableHead>Риск ухода</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {data.atRiskStudents.map((s, _i) => (
                  <TableRow key={s.student.id}>
                    <TableCell className="font-medium">{s.student.name}</TableCell>
                    <TableCell className="text-xs">{s.student.group || "—"}</TableCell>
                    <TableCell className="text-right"><ScoreBadge score={s.stats.avgScore} /></TableCell>
                    <TableCell className="text-right">{s.stats.attemptsCount}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.riskFactors.map((f) => {
                          const config = riskFactorConfig[f];
                          return config ? (
                            <Badge key={f} variant="outline" className={`${config.color} text-xs`}>
                              {config.icon} {config.label}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={dropoutRiskConfig[s.dropoutRisk]?.color || ""}>
                        {dropoutRiskConfig[s.dropoutRisk]?.label || s.dropoutRisk}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {data.atRiskStudents.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Нет студентов с рисками</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* System Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Задачи с максимальным процентом отказов</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Задача</TableHead><TableHead className="text-right">Отказы</TableHead><TableHead className="text-right">Ср. балл</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {data.systemInsights.tasksByFailRate.map((t) => (
                    <TableRow key={t.taskId}>
                      <TableCell className="font-medium">{t.taskName}</TableCell>
                      <TableCell className="text-right"><Badge variant="destructive">{t.failRate}%</Badge></TableCell>
                      <TableCell className="text-right"><ScoreBadge score={t.avgScore} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Требующие внимания темы</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Тема</TableHead><TableHead className="text-right">Ср. балл</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {data.systemInsights.weakTopics.map((t) => (
                    <TableRow key={t.topic}>
                      <TableCell className="font-medium">{t.topic}</TableCell>
                      <TableCell className="text-right"><ScoreBadge score={t.avgScore} /></TableCell>
                    </TableRow>
                  ))}
                  {data.systemInsights.weakTopics.length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">Все темы в норме</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        {data.systemInsights.groupRecommendations.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Рекомендации по группам</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.systemInsights.groupRecommendations.map((g) => (
                  <div key={g.groupId} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{g.groupName}</p>
                        <p className="text-sm text-muted-foreground">{g.recommendation}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Ср. балл: {g.avgScore}%</p>
                        <p className="text-sm text-rose-600">Риски: {g.atRiskStudents}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
