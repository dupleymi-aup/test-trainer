"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart,
  Area,
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
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  BarChart3,
} from "lucide-react";
import { AnalyticsFilterBar, FilterState } from "@/components/admin/analytics/analytics-filter-bar";

interface TimeTrendsData {
  monthlyTrends: Array<{ month: string; avgScore: number; avgEc: number; avgBv: number; attemptsCount: number }>;
  weeklyPatterns: Array<{ day: string; dayIndex: number; attemptsCount: number; avgScore: number }>;
  hourlyPatterns: Array<{ hour: number; attemptsCount: number; avgScore: number }>;
  cohortProgress: Array<{
    cohort: string;
    totalStudents: number;
    monthlyProgress: Array<{ month: string; activeStudents: number; avgScore: number; attemptsCount: number }>;
  }>;
  growthRates: { weekOverWeek: number; monthOverMonth: number };
  seasonalInsights: { peakHours: number[]; peakDays: string[]; peakMonths: string[] };
}

export default function TimeTrendsPage() {
  const [data, setData] = useState<TimeTrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<FilterState | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);
    if (filters?.groupId) params.set("groupId", filters.groupId);
    const qs = params.toString();
    fetch(`/api/admin/analytics/time-trends${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filters]);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки данных</div></AdminLayout>;

  const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const weeklyChartData = data.weeklyPatterns.map((p) => ({
    day: dayNames[p.dayIndex],
    attempts: p.attemptsCount,
    avgScore: p.avgScore,
  }));

  const hourlyChartData = data.hourlyPatterns.filter((h) => h.attemptsCount > 0).map((h) => ({
    hour: `${h.hour}:00`,
    attempts: h.attemptsCount,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Временные тренды</h2>
          <Link href="/admin/analytics" className="text-sm text-muted-foreground hover:text-foreground">
            Все отчёты <ArrowRight className="inline h-3 w-3 ml-1" />
          </Link>
        </div>

        <AnalyticsFilterBar onFilterChange={setFilters} showGroupFilter />

        {/* Growth Rates */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">Рост (неделя)</span></div>
              <p className={`text-2xl font-bold ${data.growthRates.weekOverWeek >= 0 ? "text-green-600" : "text-rose-600"}`}>
                {data.growthRates.weekOverWeek >= 0 ? "+" : ""}{data.growthRates.weekOverWeek}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-blue-600" /><span className="text-xs text-muted-foreground">Рост (месяц)</span></div>
              <p className={`text-2xl font-bold ${data.growthRates.monthOverMonth >= 0 ? "text-green-600" : "text-rose-600"}`}>
                {data.growthRates.monthOverMonth >= 0 ? "+" : ""}{data.growthRates.monthOverMonth}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-amber-600" /><span className="text-xs text-muted-foreground">Пик активности</span></div>
              <p className="text-lg font-bold">{data.seasonalInsights.peakHours.map((h) => `${h}:00`).join(", ")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><Calendar className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">Лучшие дни</span></div>
              <p className="text-lg font-bold">{data.seasonalInsights.peakDays.join(", ")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Помесячные тренды (12 месяцев)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="avgScore" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Балл" />
                <Area type="monotone" dataKey="avgEc" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.1} name="EC" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="avgBv" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.1} name="BV" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly + Hourly */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Активность по дням недели</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="attempts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Попытки" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Активность по часам</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="attempts" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} name="Попытки" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Cohort Progress */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Прогресс когорт</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Когорта</TableHead><TableHead className="text-right">Студенты</TableHead><TableHead className="text-right">Месяцев активности</TableHead><TableHead className="text-right">Последний ср. балл</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {data.cohortProgress.slice(-8).map((c) => {
                  const lastMonth = c.monthlyProgress[c.monthlyProgress.length - 1];
                  return (
                    <TableRow key={c.cohort}>
                      <TableCell className="font-medium">{c.cohort}</TableCell>
                      <TableCell className="text-right">{c.totalStudents}</TableCell>
                      <TableCell className="text-right">{c.monthlyProgress.length}</TableCell>
                      <TableCell className="text-right">
                        {lastMonth ? (
                          <Badge variant={lastMonth.avgScore >= 75 ? "default" : lastMonth.avgScore >= 50 ? "secondary" : "destructive"}>
                            {lastMonth.avgScore}%
                          </Badge>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {data.cohortProgress.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Нет данных</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Monthly Attempts Chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Количество попыток по месяцам</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="attemptsCount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Попытки" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
