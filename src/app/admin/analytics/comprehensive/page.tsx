"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScoreBadge } from "@/components/admin/analytics/score-badge";
import {
  AreaChart,
  Area,
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
  Users,
  UserCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  GraduationCap,
  BarChart3,
  Target,
  ArrowRight,
} from "lucide-react";
import { AnalyticsFilterBar, FilterState } from "@/components/admin/analytics/analytics-filter-bar";

interface ComprehensiveData {
  kpi: {
    totalStudents: number;
    totalTeachers: number;
    totalGroups: number;
    avgPlatformScore: number;
    activeStudents30d: number;
    activeRate: number;
  };
  scoreTrends: Array<{ month: string; avgScore: number; avgEc: number; avgBv: number; attemptsCount: number }>;
  cohortAnalysis: Array<{ month: string; totalStudents: number; withAttempts: number; activationRate: number }>;
  universityPerformance: Array<{ university: string; studentCount: number; avgScore: number; avgEc: number; avgBv: number; totalAttempts: number }>;
  teacherLeaderboard: Array<{ teacherId: string; name: string; groupsCount: number; studentsCount: number; avgStudentScore: number; avgAttemptsPerStudent: number; activeStudentsRate: number; trend: string; totalAttempts: number }>;
  riskOverview: { lowPerformers: number; declining: number; inactive: number; lowEngagement: number; total: number };
}

export default function ComprehensiveAnalyticsPage() {
  const [data, setData] = useState<ComprehensiveData | null>(null);
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
    fetch(`/api/admin/analytics/comprehensive${qs ? `?${qs}` : ""}`)
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Комплексная аналитика</h1>
          <Link href="/admin/analytics" className="text-sm text-muted-foreground hover:text-foreground">
            Все отчёты <ArrowRight className="inline h-3 w-3 ml-1" />
          </Link>
        </div>

        <AnalyticsFilterBar onFilterChange={setFilters} showGroupFilter showUniversityFilter />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-blue-600" /><span className="text-xs text-muted-foreground">Студенты</span></div>
              <p className="text-2xl font-bold">{data.kpi.totalStudents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><GraduationCap className="h-4 w-4 text-amber-600" /><span className="text-xs text-muted-foreground">Преподаватели</span></div>
              <p className="text-2xl font-bold">{data.kpi.totalTeachers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><BarChart3 className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">Группы</span></div>
              <p className="text-2xl font-bold">{data.kpi.totalGroups}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><Target className="h-4 w-4 text-emerald-600" /><span className="text-xs text-muted-foreground">Ср. балл</span></div>
              <p className="text-2xl font-bold">{data.kpi.avgPlatformScore}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><UserCheck className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">Активные 30д</span></div>
              <p className="text-2xl font-bold">{data.kpi.activeStudents30d}</p>
              <p className="text-xs text-muted-foreground">{data.kpi.activeRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-rose-600" /><span className="text-xs text-muted-foreground">Риски</span></div>
              <p className="text-2xl font-bold text-rose-600">{data.riskOverview.total}</p>
            </CardContent>
          </Card>
        </div>

        {/* Score Trends */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Тренды баллов (12 месяцев)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.scoreTrends}>
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

        {/* University + Teacher Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Успеваемость по университетам</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Университет</TableHead><TableHead className="text-right">Студенты</TableHead><TableHead className="text-right">Ср. балл</TableHead><TableHead className="text-right">Попытки</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {data.universityPerformance.map((u) => (
                    <TableRow key={u.university}>
                      <TableCell className="font-medium">{u.university}</TableCell>
                      <TableCell className="text-right">{u.studentCount}</TableCell>
                      <TableCell className="text-right"><ScoreBadge score={u.avgScore} /></TableCell>
                      <TableCell className="text-right">{u.totalAttempts}</TableCell>
                    </TableRow>
                  ))}
                  {data.universityPerformance.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Нет данных</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Рейтинг преподавателей</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Преподаватель</TableHead><TableHead className="text-right">Группы</TableHead><TableHead className="text-right">Студенты</TableHead><TableHead className="text-right">Ср. балл</TableHead><TableHead className="text-right">Тренд</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {data.teacherLeaderboard.map((t) => (
                    <TableRow key={t.teacherId}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-right">{t.groupsCount}</TableCell>
                      <TableCell className="text-right">{t.studentsCount}</TableCell>
                      <TableCell className="text-right"><ScoreBadge score={t.avgStudentScore} /></TableCell>
                      <TableCell className="text-right">
                        {t.trend === "improving" ? <TrendingUp className="h-4 w-4 text-green-600 inline" /> :
                         t.trend === "declining" ? <TrendingDown className="h-4 w-4 text-rose-600 inline" /> :
                         <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.teacherLeaderboard.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Нет данных</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Cohort + Risk Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Когортный анализ</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Месяц</TableHead><TableHead className="text-right">Студенты</TableHead><TableHead className="text-right">С попытками</TableHead><TableHead className="text-right">Активация</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {data.cohortAnalysis.slice(-6).map((c) => (
                    <TableRow key={c.month}>
                      <TableCell className="font-medium">{c.month}</TableCell>
                      <TableCell className="text-right">{c.totalStudents}</TableCell>
                      <TableCell className="text-right">{c.withAttempts}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={c.activationRate} className="h-2 w-16" />
                          <span className="text-xs">{c.activationRate}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Обзор рисков</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Низкая успеваемость</span><span className="font-bold text-rose-600">{data.riskOverview.lowPerformers}</span></div>
                <Progress value={data.riskOverview.total > 0 ? (data.riskOverview.lowPerformers / data.riskOverview.total) * 100 : 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Снижение прогресса</span><span className="font-bold text-amber-600">{data.riskOverview.declining}</span></div>
                <Progress value={data.riskOverview.total > 0 ? (data.riskOverview.declining / data.riskOverview.total) * 100 : 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Неактивность</span><span className="font-bold text-orange-600">{data.riskOverview.inactive}</span></div>
                <Progress value={data.riskOverview.total > 0 ? (data.riskOverview.inactive / data.riskOverview.total) * 100 : 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Низкая вовлечённость</span><span className="font-bold text-blue-600">{data.riskOverview.lowEngagement}</span></div>
                <Progress value={data.riskOverview.total > 0 ? (data.riskOverview.lowEngagement / data.riskOverview.total) * 100 : 0} className="h-2" />
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between"><span className="font-medium">Всего студентов с рисками</span><span className="text-xl font-bold text-rose-600">{data.riskOverview.total}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
