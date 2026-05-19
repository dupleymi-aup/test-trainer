"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Award, AlertCircle,
  Clock, Zap, BarChart3, Users, Printer,
} from "lucide-react";
import { PrintButton } from "@/components/admin/analytics/print-button";

// Print styles
const printStyles = `
@media print {
  nav, header, [class*="sticky"], button, .print\\:hidden { display: none !important; }
  .space-y-6 { margin: 0 !important; }
  .grid { display: grid !important; gap: 0.75rem !important; }
  body { font-size: 10px; }
  .max-h-80 { max-height: none !important; overflow: visible !important; }
}
`;
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface StudentData {
  student: { id: string; name: string | null; email: string | null; phone: string | null; group: string | null; university: string | null; createdAt: string; isActive: boolean };
  stats: { bestScore: number; avgScore: number; avgEc: number; avgBv: number; avgCorrectness: number; totalAttempts: number; avgTimeSpent: number; velocity: number; attemptsLast7Days: number; attemptsLast30Days: number; firstAttemptDate: string | null; lastAttemptDate: string | null };
  attempts: Array<{ id: string; taskId: string; score: number; ecCoverage: number; bvCoverage: number; correctness: number; timeSpent: number; createdAt: string }>;
  scoresOverTime: Array<{ date: string; score: number; ecCoverage: number; bvCoverage: number }>;
  taskPerformance: Array<{ taskId: string; taskName: string; bestScore: number; avgScore: number; attemptsCount: number; avgEc: number; avgBv: number; trend: "improving" | "stable" | "declining"; avgTimeSpent: number }>;
  weakAreas: Array<{ topic: string; avgScore: number; taskCount: number }>;
  strongAreas: Array<{ topic: string; avgScore: number; taskCount: number }>;
  groupPercentile: number;
  groupRanking: { rank: number; totalInGroup: number };
  timeAnalysis: { avgTimePerTask: Array<{ taskId: string; taskName: string; avgTimeSpent: number }>; totalTimeSpent: number; timeDistribution: Record<string, number> };
  recommendations: string[];
  percentileByTask: Array<{ taskId: string; taskName: string; studentBest: number; groupAvg: number }>;
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4 text-rose-600" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
}

function scoreBadge(score: number) {
  return (
    <Badge variant={score >= 75 ? "default" : score >= 50 ? "secondary" : "destructive"}>
      {score}%
    </Badge>
  );
}

export default function AdminStudentReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/analytics/student/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center text-rose-600">Студент не найден или нет данных</div></AdminLayout>;

  const { student, stats, scoresOverTime, taskPerformance, weakAreas, strongAreas, groupPercentile, groupRanking, timeAnalysis, recommendations, attempts } = data;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}м ${s}с` : `${s}с`;
  };

  return (
    <AdminLayout>
      <style>{printStyles}</style>
      <div className="space-y-6">
        {/* Header + Back */}
        <div className="flex items-center gap-3">
          <Link href="/admin/analytics/predictions">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Назад</Button>
          </Link>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{student.name || student.email}</h2>
            <p className="text-sm text-muted-foreground">
              {student.email}{student.group ? ` • ${student.group}` : ""}{student.university ? ` • ${student.university}` : ""}
            </p>
          </div>
          <Badge variant={student.isActive ? "default" : "destructive"}>
            {student.isActive ? "Активен" : "Неактивен"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Регистрация: {new Date(student.createdAt).toLocaleDateString("ru-RU")}
          </span>
          <PrintButton label="Печать отчёта" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Лучший балл</div><div className="text-2xl font-bold">{scoreBadge(stats.bestScore)}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Средний балл</div><div className="text-2xl font-bold">{scoreBadge(stats.avgScore)}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-1 text-xs text-muted-foreground"><BarChart3 className="h-3 w-3" /> Попыток</div><div className="text-2xl font-bold">{stats.totalAttempts}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Ср. время</div><div className="text-2xl font-bold">{formatTime(stats.avgTimeSpent)}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /> Перцентиль</div><div className="text-2xl font-bold">{groupPercentile}%</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-1 text-xs text-muted-foreground"><Zap className="h-3 w-3" /> Скорость</div><div className="text-2xl font-bold">{stats.velocity}/день</div></CardContent></Card>
        </div>

        {/* Score Trends */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Динамика баллов</CardTitle></CardHeader>
          <CardContent>
            {scoresOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={scoresOverTime.map((d) => ({ ...d, date: new Date(d.date).toLocaleDateString("ru-RU") }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} name="Балл" dot={false} />
                  <Line type="monotone" dataKey="ecCoverage" stroke="#10b981" strokeWidth={1.5} name="EC" dot={false} />
                  <Line type="monotone" dataKey="bvCoverage" stroke="#f59e0b" strokeWidth={1.5} name="BV" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Нет данных</p>
            )}
          </CardContent>
        </Card>

        {/* Task Performance + Weak/Strong Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Performance */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Выполнение задач</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Задача</TableHead>
                    <TableHead className="text-right">Лучший</TableHead>
                    <TableHead className="text-right">Попытки</TableHead>
                    <TableHead className="text-right">Тренд</TableHead>
                    <TableHead className="text-right">Ср. время</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskPerformance.map((tp) => (
                    <TableRow key={tp.taskId}>
                      <TableCell className="font-medium">{tp.taskName}</TableCell>
                      <TableCell className="text-right">{scoreBadge(tp.bestScore)}</TableCell>
                      <TableCell className="text-right">{tp.attemptsCount}</TableCell>
                      <TableCell className="text-right"><TrendIcon trend={tp.trend} /></TableCell>
                      <TableCell className="text-right text-sm">{formatTime(tp.avgTimeSpent)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Weak/Strong Areas */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Зоны роста и сильные стороны</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {weakAreas.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-rose-600 mb-2 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Зоны роста</h4>
                  {weakAreas.map((area) => (
                    <div key={area.topic} className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{area.topic}</span>
                        <span className="font-medium">{area.avgScore}%</span>
                      </div>
                      <Progress value={area.avgScore} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
              {strongAreas.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-emerald-600 mb-2 flex items-center gap-1"><Award className="h-3 w-3" /> Сильные стороны</h4>
                  {strongAreas.map((area) => (
                    <div key={area.topic} className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{area.topic}</span>
                        <span className="font-medium">{area.avgScore}%</span>
                      </div>
                      <Progress value={area.avgScore} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Time Analysis + Group Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time per Task */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Среднее время по задачам</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={timeAnalysis.avgTimePerTask}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="taskName" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => formatTime(v)} />
                  <Bar dataKey="avgTimeSpent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Group Ranking + Time Distribution */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Рейтинг в группе и распределение времени</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Позиция в группе</span>
                  <span className="font-bold">{groupRanking.rank}/{groupRanking.totalInGroup} (перцентиль: {groupPercentile}%)</span>
                </div>
                <Progress value={groupPercentile} className="h-3" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                {Object.entries(timeAnalysis.timeDistribution).map(([range, count]) => (
                  <div key={range} className="text-center">
                    <div className="text-xs text-muted-foreground">{range}</div>
                    <div className="text-lg font-bold">{count}</div>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground">Общее время</div>
                <div className="text-xl font-bold">{formatTime(timeAnalysis.totalTimeSpent)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Рекомендации</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Attempt History */}
        <Card>
          <CardHeader><CardTitle className="text-sm">История попыток ({attempts.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Задача</TableHead>
                    <TableHead className="text-right">Балл</TableHead>
                    <TableHead className="text-right">EC</TableHead>
                    <TableHead className="text-right">BV</TableHead>
                    <TableHead className="text-right">Корректн.</TableHead>
                    <TableHead className="text-right">Время</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...attempts].reverse().map((a) => {
                    const taskName = taskPerformance.find((tp) => tp.taskId === a.taskId)?.taskName || `Задание ${a.taskId}`;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm">{new Date(a.createdAt).toLocaleDateString("ru-RU")}</TableCell>
                        <TableCell className="font-medium text-sm">{taskName}</TableCell>
                        <TableCell className="text-right">{scoreBadge(a.score)}</TableCell>
                        <TableCell className="text-right text-sm">{a.ecCoverage}%</TableCell>
                        <TableCell className="text-right text-sm">{a.bvCoverage}%</TableCell>
                        <TableCell className="text-right text-sm">{a.correctness}%</TableCell>
                        <TableCell className="text-right text-sm">{formatTime(a.timeSpent)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
