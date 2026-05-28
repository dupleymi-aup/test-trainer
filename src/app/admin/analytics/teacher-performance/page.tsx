"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  FolderKanban,
  ChevronDown,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { AnalyticsFilterBar, FilterState } from "@/components/admin/analytics/analytics-filter-bar";
import { ScoreBadge } from "@/components/admin/analytics/score-badge";

interface TeacherData {
  teachers: Array<{
    teacherId: string;
    name: string;
    email: string | null;
    groupsCount: number;
    studentsCount: number;
    avgStudentScore: number;
    avgAttemptsPerStudent: number;
    activeStudentsRate: number;
    trend: string;
    totalAttempts: number;
    groups: Array<{
      id: string;
      name: string;
      studentCount: number;
      activeStudents: number;
      inactiveStudents: number;
      avgScore: number;
      students: Array<{
        id: string;
        name: string;
        attemptsCount: number;
        bestScore: number;
        avgScore: number;
        avgEc: number;
        avgBv: number;
        isActive: boolean;
        trend: string;
      }>;
    }>;
  }>;
}

export default function TeacherPerformancePage() {
  const [data, setData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);
    const qs = params.toString();
    setError(null);
    fetch(`/api/admin/analytics/teacher-performance${qs ? `?${qs}` : ""}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, [filters]);

  const toggleTeacher = (id: string) => {
    const next = new Set(expandedTeachers);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedTeachers(next);
  };

  const toggleGroup = (id: string) => {
    const next = new Set(expandedGroups);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedGroups(next);
  };

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки данных</div></AdminLayout>;


  const trendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingUp className="h-4 w-4 text-green-600 inline" />;
    if (trend === "declining") return <TrendingDown className="h-4 w-4 text-rose-600 inline" />;
    return <Minus className="h-4 w-4 text-muted-foreground inline" />;
  };

  const chartData = data.teachers
    .filter((t) => t.studentsCount > 0)
    .map((t) => ({ name: t.name.split(" ")[0], avgScore: t.avgStudentScore, attempts: t.totalAttempts }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Аналитика по преподавателям</h1>
          <Link href="/admin/analytics" className="text-sm text-muted-foreground hover:text-foreground">
            Все отчёты <ArrowRight className="inline h-3 w-3 ml-1" />
          </Link>
        </div>

        <AnalyticsFilterBar onFilterChange={setFilters} />

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-blue-600" /><span className="text-xs text-muted-foreground">Преподаватели</span></div>
              <p className="text-2xl font-bold">{data.teachers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><FolderKanban className="h-4 w-4 text-amber-600" /><span className="text-xs text-muted-foreground">Всего групп</span></div>
              <p className="text-2xl font-bold">{data.teachers.reduce((s, t) => s + t.groupsCount, 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">Всего студентов</span></div>
              <p className="text-2xl font-bold">{data.teachers.reduce((s, t) => s + t.studentsCount, 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">Улучшают</span></div>
              <p className="text-2xl font-bold text-green-600">{data.teachers.filter((t) => t.trend === "improving").length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Средний балл по преподавателям (топ-10)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Ср. балл" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Teacher List */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Детализация по преподавателям</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Преподаватель</TableHead>
                  <TableHead className="text-right">Группы</TableHead>
                  <TableHead className="text-right">Студенты</TableHead>
                  <TableHead className="text-right">Ср. балл</TableHead>
                  <TableHead className="text-right">Активность</TableHead>
                  <TableHead className="text-right">Тренд</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.teachers.map((t) => (
                  <>
                    <TableRow key={t.teacherId} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleTeacher(t.teacherId)}>
                      <TableCell>{expandedTeachers.has(t.teacherId) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-right">{t.groupsCount}</TableCell>
                      <TableCell className="text-right">{t.studentsCount}</TableCell>
                      <TableCell className="text-right">{t.studentsCount > 0 ? <ScoreBadge score={t.avgStudentScore} /> : "—"}</TableCell>
                      <TableCell className="text-right">
                        {t.studentsCount > 0 ? (
                          <div className="flex items-center gap-2 justify-end">
                            <Progress value={t.activeStudentsRate} className="h-2 w-12" />
                            <span className="text-xs">{t.activeStudentsRate}%</span>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">{trendIcon(t.trend)}</TableCell>
                    </TableRow>
                    {expandedTeachers.has(t.teacherId) && t.groups.map((g) => (
                      <TableRow key={g.id} className="bg-muted/30">
                        <TableCell colSpan={7} className="pl-12">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleGroup(g.id)}>
                              {expandedGroups.has(g.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              <span className="font-medium text-sm">{g.name}</span>
                              <span className="text-xs text-muted-foreground">{g.studentCount} студ. | {g.avgScore}%</span>
                            </div>
                            {expandedGroups.has(g.id) && (
                              <div className="ml-6 space-y-1">
                                {g.students.map((s) => (
                                  <div key={s.id} className="flex items-center justify-between text-sm py-1">
                                    <span className="text-muted-foreground">{s.name}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs">{s.attemptsCount} попыток</span>
                                      <ScoreBadge score={s.avgScore} />
                                      {trendIcon(s.trend)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
                {data.teachers.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Нет преподавателей</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
