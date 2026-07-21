"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState } from "react";
import { useFetchData } from "@/hooks/use-fetch-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { PrintButton } from "@/components/admin/analytics/print-button";
import {
  TrendingUp,
  Target,
  Activity,
  Calendar,
} from "lucide-react";

interface Cohort {
  cohort: string;
  cohortLabel: string;
  studentCount: number;
  totalAttempts: number;
  avgAttemptsPerStudent: number;
  avgScore: number;
  activeRate: number;
  dropOffRate: number;
  completionRate: number;
  weeksSinceCohort: number;
  weeklyRetention: number[];
}

interface CohortData {
  cohorts: Cohort[];
  summary: {
    totalCohorts: number;
    avgActiveRate: number;
    avgDropOffRate: number;
    avgCompletionRate: number;
  };
}

export default function CohortAnalysisPage() {
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const { data, loading, error } = useFetchData<CohortData>("/api/admin/analytics/cohort-analysis");

  if (loading) return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Load error: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки</div></AdminLayout>;

  const selected = selectedCohort ? data.cohorts.find((c) => c.cohort === selectedCohort) : null;
  const retentionChartData = selected
    ? selected.weeklyRetention.map((count, week) => ({ week, count, pct: selected.studentCount > 0 ? Math.round((count / selected.studentCount) * 100) : 0 }))
    : [];

  // Multi-cohort comparison: retention rates over first N weeks
  const maxWeeks = Math.min(...data.cohorts.map((c) => c.weeklyRetention.length), 12);
  const comparisonData = Array.from({ length: maxWeeks }, (_, week) => {
    const row: Record<string, number | string> = { week };
    for (const c of data.cohorts.slice(0, 6)) {
      const count = c.weeklyRetention[week] || 0;
      row[c.cohort] = c.studentCount > 0 ? Math.round((count / c.studentCount) * 100) : 0;
    }
    return row;
  });

  const cohortColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Анализ когорт</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Кривые удержения по месяцам регистрации, сравнение когорт
            </p>
          </div>
          <PrintButton />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" /><span className="text-xs text-muted-foreground">Когорты</span></div>
              <p className="text-2xl font-bold">{data.summary.totalCohorts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-emerald-600" /><span className="text-xs text-muted-foreground">Ср. активность</span></div>
              <p className="text-2xl font-bold">{data.summary.avgActiveRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-rose-600" /><span className="text-xs text-muted-foreground">Ср. отток</span></div>
              <p className="text-2xl font-bold">{data.summary.avgDropOffRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">Ср. завершение</span></div>
              <p className="text-2xl font-bold">{data.summary.avgCompletionRate}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Multi-cohort retention comparison */}
        {comparisonData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Сравнение удержения когорт (%)</CardTitle>
              <CardDescription>Первые {maxWeeks} недель</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" label={{ value: "Неделя", position: "insideBottom", offset: -5 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  {data.cohorts.slice(0, 6).map((c, i) => (
                    <Line
                      key={c.cohort}
                      type="monotone"
                      dataKey={c.cohort}
                      stroke={cohortColors[i]}
                      strokeWidth={2}
                      name={c.cohortLabel}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Cohort table */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Когорты по месяцам</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Когорта</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Attempts</TableHead>
                  <TableHead className="text-center">Attempts/student</TableHead>
                  <TableHead className="text-center">Avg. score</TableHead>
                  <TableHead className="text-center">Активные</TableHead>
                  <TableHead className="text-center">Отток</TableHead>
                  <TableHead className="text-center">Завершение</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.cohorts.map((c) => (
                  <TableRow key={c.cohort} className={selectedCohort === c.cohort ? "bg-muted/50" : ""}>
                    <TableCell className="font-medium">
                      {c.cohortLabel}
                      <div className="text-xs text-muted-foreground">{c.weeksSinceCohort} нед. назад</div>
                    </TableCell>
                    <TableCell className="text-center">{c.studentCount}</TableCell>
                    <TableCell className="text-center">{c.totalAttempts}</TableCell>
                    <TableCell className="text-center">{c.avgAttemptsPerStudent}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.avgScore >= 75 ? "default" : c.avgScore >= 50 ? "secondary" : "destructive"}>{c.avgScore}%</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={c.activeRate >= 50 ? "text-emerald-600 font-bold" : c.activeRate >= 30 ? "text-amber-600 dark:text-amber-400" : "text-rose-600"}>{c.activeRate}%</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={c.dropOffRate <= 30 ? "text-emerald-600" : c.dropOffRate <= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 font-bold"}>{c.dropOffRate}%</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress value={c.completionRate} className="w-12 h-2" />
                        <span className="text-xs font-bold">{c.completionRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant={selectedCohort === c.cohort ? "default" : "outline"} size="sm" onClick={() => setSelectedCohort(selectedCohort === c.cohort ? null : c.cohort)}>
                        {selectedCohort === c.cohort ? "Скрыть" : "Детали"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Selected cohort detail */}
        {selected && retentionChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Удержание: {selected.cohortLabel}</CardTitle>
              <CardDescription>{selected.studentCount} студентов, {selected.weeksSinceCohort} недель наблюдения</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={retentionChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" label={{ value: "Неделя", position: "insideBottom", offset: -5 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Active Students" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
