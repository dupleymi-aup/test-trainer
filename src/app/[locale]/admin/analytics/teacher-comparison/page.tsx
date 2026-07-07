"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TrendIndicator } from "@/components/admin/analytics/trend-indicator";
import { ScoreBadge } from "@/components/admin/analytics/score-badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ChevronDown, ChevronRight, Users, Activity } from "lucide-react";

interface TeacherData {
  teacherId: string;
  name: string;
  email: string;
  groupsCount: number;
  studentsCount: number;
  activeStudentsCount: number;
  totalAttempts: number;
  avgScore: number;
  avgEc: number;
  avgBv: number;
  activeStudentsRate: number;
  improvingStudents: number;
  decliningStudents: number;
  effectivenessScore: number;
  rank: number;
  trend: "improving" | "stable" | "declining";
  groups: Array<{
    id: string;
    name: string;
    studentCount: number;
    avgScore: number;
    activeRate: number;
  }>;
}

interface ComparisonData {
  teachers: TeacherData[];
  platformAvg: { avgScore: number; activeRate: number; effectivenessScore: number };
  totalTeachers: number;
}

const rankIcons: Record<number, string> = {
  1: "\u{1F947}",
  2: "\u{1F948}",
  3: "\u{1F949}",
};

export default function TeacherComparisonPage() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetch("/api/admin/analytics/teacher-comparison", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { if (controller.signal.aborted) return; setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
    return () => controller.abort();
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center text-rose-600">Нет данных</div></AdminLayout>;

  const chartData = data.teachers.map((t) => ({
    name: t.name.split(" ")[0] || t.name,
    effectiveness: t.effectivenessScore,
    avgScore: t.avgScore,
    activeRate: t.activeStudentsRate,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Сравнение эффективности преподавателей</h1>

        {/* Platform averages */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Ср. эффективность</div>
              <div className="text-2xl font-bold">{data.platformAvg.effectivenessScore}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Ср. балл студентов</div>
              <div className="text-2xl font-bold">{data.platformAvg.avgScore}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Ср. активность</div>
              <div className="text-2xl font-bold">{data.platformAvg.activeRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Сравнительная диаграмма</CardTitle>
            <CardDescription>Эффективность, средний балл и активность по преподавателям</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="effectiveness" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Эффективность" />
                <Bar dataKey="avgScore" fill="#22c55e" radius={[3, 3, 0, 0]} name="Ср. балл" />
                <Bar dataKey="activeRate" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Активность" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Teacher ranking table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Рейтинг преподавателей</CardTitle>
            <CardDescription>
              Композитный score: 30% балл + 20% активность + 20% улучшения + 15% EC + 15% BV
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Преподаватель</TableHead>
                  <TableHead className="text-right">Группы</TableHead>
                  <TableHead className="text-right">Студенты</TableHead>
                  <TableHead className="text-right">Попытки</TableHead>
                  <TableHead className="text-right">Ср. балл</TableHead>
                  <TableHead className="text-right">Активность</TableHead>
                  <TableHead className="text-right">Эффективность</TableHead>
                  <TableHead>Тренд</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.teachers.map((t) => (
                  <>
                    <TableRow
                      key={t.teacherId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedTeacher(expandedTeacher === t.teacherId ? null : t.teacherId)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Показать детали преподавателя ${t.name}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedTeacher(expandedTeacher === t.teacherId ? null : t.teacherId);
                        }
                      }}
                    >
                      <TableCell>
                        {expandedTeacher === t.teacherId
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell>
                        {t.rank <= 3 ? (
                          <span className="text-lg">{rankIcons[t.rank]}</span>
                        ) : (
                          <span className="text-muted-foreground font-medium">{t.rank}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-right">{t.groupsCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {t.studentsCount}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{t.totalAttempts}</TableCell>
                      <TableCell className="text-right">
                        <ScoreBadge score={t.avgScore} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={t.activeStudentsRate} className="h-2 w-16" />
                          <span className="text-xs">{t.activeStudentsRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={t.effectivenessScore >= 70 ? "default" : t.effectivenessScore >= 50 ? "secondary" : "destructive"}
                          className="font-bold"
                        >
                          {t.effectivenessScore}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TrendIndicator trend={t.trend} />
                      </TableCell>
                    </TableRow>
                    {expandedTeacher === t.teacherId && t.groups.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="bg-muted/30 p-0">
                          <div className="p-4">
                            <div className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Activity className="h-4 w-4 text-muted-foreground" />
                              Группы: {t.name}
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Группа</TableHead>
                                  <TableHead className="text-right">Студенты</TableHead>
                                  <TableHead className="text-right">Ср. балл</TableHead>
                                  <TableHead className="text-right">Активность</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {t.groups.map((g) => (
                                  <TableRow key={g.id}>
                                    <TableCell className="font-medium">{g.name}</TableCell>
                                    <TableCell className="text-right">{g.studentCount}</TableCell>
                                    <TableCell className="text-right">
                                      <ScoreBadge score={g.avgScore} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <Progress value={g.activeRate} className="h-2 w-16" />
                                        <span className="text-xs">{g.activeRate}%</span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Improving vs declining students per teacher */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Динамика студентов по преподавателям</CardTitle>
            <CardDescription>Количество улучшающихся и снижающихся студентов</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={data.teachers.map((t) => ({
                  name: t.name.split(" ")[0] || t.name,
                  improving: t.improvingStudents,
                  declining: t.decliningStudents,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" allowDecimals={false} className="text-xs" />
                <YAxis type="category" dataKey="name" className="text-xs" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="improving" fill="#22c55e" radius={[0, 3, 3, 0]} name="Улучшаются" />
                <Bar dataKey="declining" fill="#ef4444" radius={[0, 3, 3, 0]} name="Снижаются" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
