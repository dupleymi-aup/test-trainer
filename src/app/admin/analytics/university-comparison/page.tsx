"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScoreBadge } from "@/components/admin/analytics/score-badge";
import { TrendIndicator } from "@/components/admin/analytics/trend-indicator";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, ArrowRight, GraduationCap } from "lucide-react";
import { AnalyticsFilterBar, FilterState } from "@/components/admin/analytics/analytics-filter-bar";

interface UniversityData {
  universities: Array<{
    university: string;
    studentCount: number;
    avgScore: number;
    avgEc: number;
    avgBv: number;
    totalAttempts: number;
    topTasks: Array<{ taskId: string; taskName: string; avgScore: number; attemptsCount: number }>;
    trend: string;
  }>;
}

export default function UniversityComparisonPage() {
  const [data, setData] = useState<UniversityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);
    if (filters?.groupId) params.set("groupId", filters.groupId);
    const qs = params.toString();
    setError(null);
    fetch(`/api/admin/analytics/university-comparison${qs ? `?${qs}` : ""}`)
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

  const _universities = data.universities;

  const barData = data.universities.slice(0, 10).map((u) => ({
    name: u.university.length > 20 ? u.university.slice(0, 20) + "..." : u.university,
    avgScore: u.avgScore,
    avgEc: u.avgEc,
    avgBv: u.avgBv,
  }));

  const _radarData = data.universities.slice(0, 3).map((u, i) => ({
    topic: `Университет ${i + 1}`,
    score: u.avgScore,
    ec: u.avgEc,
    bv: u.avgBv,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Сравнение по университетам</h1>
          <Link href="/admin/analytics" className="text-sm text-muted-foreground hover:text-foreground">
            Все отчёты <ArrowRight className="inline h-3 w-3 ml-1" />
          </Link>
        </div>

        <AnalyticsFilterBar onFilterChange={setFilters} showGroupFilter />

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" /><span className="text-xs text-muted-foreground">Университеты</span></div>
              <p className="text-2xl font-bold">{data.universities.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">Улучшают</span></div>
              <p className="text-2xl font-bold text-green-600">{data.universities.filter((u) => u.trend === "improving").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><TrendingDown className="h-4 w-4 text-rose-600" /><span className="text-xs text-muted-foreground">Снижают</span></div>
              <p className="text-2xl font-bold text-rose-600">{data.universities.filter((u) => u.trend === "declining").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><Badge className="text-xs">Ср. балл</Badge><span className="text-xs text-muted-foreground ml-1">лучший</span></div>
              <p className="text-2xl font-bold">{data.universities.length > 0 ? data.universities[0].avgScore : 0}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Bar Chart */}
        {barData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Сравнение баллов по университетам</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgScore" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Балл" />
                  <Bar dataKey="avgEc" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} name="EC" />
                  <Bar dataKey="avgBv" fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} name="BV" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* University Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Рейтинг университетов</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>#</TableHead><TableHead>Университет</TableHead><TableHead className="text-right">Студенты</TableHead><TableHead className="text-right">Ср. балл</TableHead><TableHead className="text-right">Тренд</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {data.universities.map((u, i) => (
                    <TableRow key={u.university}>
                      <TableCell className="font-bold">{i + 1}</TableCell>
                      <TableCell className="font-medium">{u.university}</TableCell>
                      <TableCell className="text-right">{u.studentCount}</TableCell>
                      <TableCell className="text-right"><ScoreBadge score={u.avgScore} /></TableCell>
                      <TableCell className="text-right"><TrendIndicator trend={u.trend as "improving" | "stable" | "declining" | "none"} compact /></TableCell>
                    </TableRow>
                  ))}
                  {data.universities.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Нет данных</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Детализация</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Университет</TableHead><TableHead className="text-right">EC</TableHead><TableHead className="text-right">BV</TableHead><TableHead className="text-right">Попытки</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {data.universities.map((u) => (
                    <TableRow key={u.university}>
                      <TableCell className="font-medium">{u.university}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={u.avgEc} className="h-2 w-12" />
                          <span className="text-xs">{u.avgEc}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={u.avgBv} className="h-2 w-12" />
                          <span className="text-xs">{u.avgBv}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{u.totalAttempts}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
