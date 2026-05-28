"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/admin/analytics/score-badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Users, Calendar,
  FileText, CheckCircle, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface GroupData {
  group: { id: string; name: string; description: string; createdBy: { name: string; email: string } | null; createdAt: string; updatedAt: string };
  members: Array<{
    id: string; name: string; email: string; university: string; createdAt: string;
    stats: { bestScore: number; avgScore: number; attemptsCount: number; lastAttemptDate: string | null; isActive: boolean; trend: "improving" | "stable" | "declining" };
  }>;
  taskCompletionMatrix: Array<{ taskId: string; taskName: string; difficulty: string; completedCount: number; avgScore: number; bestScore: number; completionRate: number }>;
  performanceDistribution: Record<string, number>;
  taskComparison: Array<{ taskId: string; taskName: string; groupAvgScore: number; groupAvgEc: number; groupAvgBv: number; platformAvgScore: number }>;
  activityTimeline: Array<{ date: string; attemptsCount: number; uniqueStudents: number }>;
  summary: { totalMembers: number; activeMembers: number; totalAttempts: number; avgGroupScore: number; avgEc: number; avgBv: number; tasksAssigned: number; tasksCompleted: number };
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") return <TrendingUp className="h-3 w-3 text-emerald-600" />;
  if (trend === "declining") return <TrendingDown className="h-3 w-3 text-rose-600" />;
  return <Minus className="h-3 w-3 text-gray-400" />;
}

function difficultyBadge(difficulty: string) {
  const colors: Record<string, string> = {
    "Легко": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    "Средне": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    "Сложно": "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
  };
  return <Badge className={`${colors[difficulty] || "bg-gray-100 text-gray-800"} border-0`}>{difficulty}</Badge>;
}

export default function AdminGroupAnalyticsPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/analytics/group/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, [id]);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center text-rose-600">Группа не найдена</div></AdminLayout>;

  const { group, members, taskCompletionMatrix, performanceDistribution, taskComparison, activityTimeline, summary } = data;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/groups">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Назад</Button>
          </Link>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{group.name}</h2>
            {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
          </div>
          {group.createdBy && (
            <span className="text-xs text-muted-foreground">
              Создана: {group.createdBy.name || group.createdBy.email}
            </span>
          )}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(group.createdAt).toLocaleDateString("ru-RU")}
          </span>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /> Всего</div><div className="text-2xl font-bold">{summary.totalMembers}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Активных</div><div className="text-2xl font-bold text-emerald-600">{summary.activeMembers}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-1 text-xs text-muted-foreground"><Activity className="h-3 w-3" /> Попыток</div><div className="text-2xl font-bold">{summary.totalAttempts}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Ср. балл</div><div className="text-2xl font-bold"><ScoreBadge score={summary.avgGroupScore} /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Ср. EC</div><div className="text-2xl font-bold">{summary.avgEc}%</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Ср. BV</div><div className="text-2xl font-bold">{summary.avgBv}%</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-1 text-xs text-muted-foreground"><FileText className="h-3 w-3" /> Назначено</div><div className="text-2xl font-bold">{summary.tasksAssigned}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle className="h-3 w-3" /> Выполнено</div><div className="text-2xl font-bold">{summary.tasksCompleted}</div></CardContent></Card>
        </div>

        {/* Members Table */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Участники группы</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Студент</TableHead>
                  <TableHead>Университет</TableHead>
                  <TableHead className="text-right">Лучший</TableHead>
                  <TableHead className="text-right">Средний</TableHead>
                  <TableHead className="text-right">Попытки</TableHead>
                  <TableHead className="text-right">Тренд</TableHead>
                  <TableHead className="text-right">Активность</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      <div>{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">{m.university || "—"}</TableCell>
                    <TableCell className="text-right"><ScoreBadge score={m.stats.bestScore} /></TableCell>
                    <TableCell className="text-right"><ScoreBadge score={m.stats.avgScore} /></TableCell>
                    <TableCell className="text-right text-sm">{m.stats.attemptsCount}</TableCell>
                    <TableCell className="text-right"><TrendIcon trend={m.stats.trend} /></TableCell>
                    <TableCell className="text-right">
                      <Badge variant={m.stats.isActive ? "default" : "secondary"} className="text-xs">
                        {m.stats.isActive ? "Активен" : "Неактивен"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/analytics/student/${m.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7">Подробнее</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Task Completion Matrix */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Матрица выполнения задач</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white dark:bg-gray-950 z-10">Задача</TableHead>
                    <TableHead>Сложность</TableHead>
                    <TableHead className="text-right">Выполнено</TableHead>
                    <TableHead className="text-right">Ср. балл</TableHead>
                    <TableHead className="text-right">Лучший</TableHead>
                    <TableHead className="text-right">Завершение %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskCompletionMatrix.map((tc) => (
                    <TableRow key={tc.taskId}>
                      <TableCell className="font-medium sticky left-0 bg-white dark:bg-gray-950 z-10">{tc.taskName}</TableCell>
                      <TableCell>{difficultyBadge(tc.difficulty)}</TableCell>
                      <TableCell className="text-right text-sm">{tc.completedCount}</TableCell>
                      <TableCell className="text-right"><ScoreBadge score={tc.avgScore} /></TableCell>
                      <TableCell className="text-right"><ScoreBadge score={tc.bestScore} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={tc.completionRate} className="h-2 w-16" />
                          <span className="text-xs">{tc.completionRate}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Performance Distribution + Task Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Распределение баллов в группе</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={Object.entries(performanceDistribution).map(([range, count]) => ({ range, count }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="range" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Сравнение: группа vs платформа</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={taskComparison}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="taskName" className="text-xs" tick={{ fontSize: 9 }} />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="groupAvgScore" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Группа" />
                  <Bar dataKey="platformAvgScore" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Платформа" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Активность (30 дней)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={activityTimeline}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="attemptsCount" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} name="Попытки" />
                <Area type="monotone" dataKey="uniqueStudents" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Студенты" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
