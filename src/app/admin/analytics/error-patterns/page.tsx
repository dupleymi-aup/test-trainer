"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { PrintButton } from "@/components/admin/analytics/print-button";
import {
  AlertTriangle,
  XCircle,
  Users,
  FileText,
  Target,
  Shield,
} from "lucide-react";

interface PerTaskError {
  taskId: string;
  taskName: string;
  errorAttemptsCount: number;
  criticalErrorAttempts: number;
  avgScoreOnErrors: number;
  totalAttempts: number;
  errorRate: number;
}

interface StudentCoverage {
  id: string;
  name: string;
  group: string;
  avgEC: number;
  avgBV: number;
  attempts: number;
}

interface ErrorPatternsData {
  summary: {
    totalAttempts: number;
    avgECCoverage: number;
    avgBVCoverage: number;
    lowScoreAttempts: number;
    lowScorePct: number;
  };
  ecDistribution: Record<string, number>;
  bvDistribution: Record<string, number>;
  perTaskErrors: PerTaskError[];
  worstECStudents: StudentCoverage[];
  errorTrend: Array<{ month: string; errorRate: number; totalAttempts: number; errorAttempts: number }>;
}

export default function ErrorPatternsPage() {
  const [data, setData] = useState<ErrorPatternsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/analytics/error-patterns", { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { if (controller.signal.aborted) return; setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
    return () => controller.abort();
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки</div></AdminLayout>;

  const { summary, ecDistribution, bvDistribution, perTaskErrors, worstECStudents, errorTrend } = data;

  const ecDistData = Object.entries(ecDistribution).map(([range, count]) => ({ range, count }));
  const bvDistData = Object.entries(bvDistribution).map(([range, count]) => ({ range, count }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Анализ типичных ошибок</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Проблемные EC/BV, студенты с худшим покрытием, тренды ошибок
            </p>
          </div>
          <PrintButton />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" /><span className="text-xs text-muted-foreground">Всего попыток</span></div>
              <p className="text-2xl font-bold">{summary.totalAttempts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-emerald-600" /><span className="text-xs text-muted-foreground">Ср. EC покрытие</span></div>
              <p className="text-2xl font-bold">{summary.avgECCoverage}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Shield className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">Ср. BV покрытие</span></div>
              <p className="text-2xl font-bold">{summary.avgBVCoverage}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><XCircle className="h-4 w-4 text-rose-600" /><span className="text-xs text-muted-foreground">Ошибки (&lt;60%)</span></div>
              <p className="text-2xl font-bold text-rose-600">{summary.lowScoreAttempts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" /><span className="text-xs text-muted-foreground">% ошибок</span></div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.lowScorePct}%</p>
            </CardContent>
          </Card>
        </div>

        {/* EC/BV Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Распределение EC покрытия</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ecDistData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="range" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {ecDistData.map((entry, i) => (
                      <Bar key={i} dataKey="count" fill={i < 2 ? "#ef4444" : i < 3 ? "#f59e0b" : "#10b981"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Распределение BV покрытия</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={bvDistData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="range" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {bvDistData.map((entry, i) => (
                      <Bar key={i} dataKey="count" fill={i < 2 ? "#ef4444" : i < 3 ? "#f59e0b" : "#10b981"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Error trend */}
        {errorTrend.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Тренд ошибок по месяцам</CardTitle>
              <CardDescription>% попыток с баллом ниже 60%</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={errorTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={2} name="Ошибки %" dot />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Tasks with most errors */}
        {perTaskErrors.length > 0 && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Задания с наибольшим количеством ошибок
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Задание</TableHead>
                      <TableHead className="text-center">Ошибочных попыток</TableHead>
                      <TableHead className="text-center">Критических</TableHead>
                      <TableHead className="text-center">% ошибок</TableHead>
                      <TableHead className="text-center">Ср. балл при ошибке</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perTaskErrors.map((t) => (
                      <TableRow key={t.taskId}>
                        <TableCell className="font-medium max-w-[250px]">
                          <div className="truncate" title={t.taskName}>{t.taskName}</div>
                        </TableCell>
                        <TableCell className="text-center">{t.errorAttemptsCount}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{t.criticalErrorAttempts}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <Progress value={t.errorRate} className="w-16 h-2" />
                            <span className={`text-xs font-bold ${t.errorRate > 50 ? "text-rose-600" : t.errorRate > 30 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}>
                              {t.errorRate}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={t.avgScoreOnErrors >= 50 ? "secondary" : "destructive"}>{t.avgScoreOnErrors}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Students with worst EC/BV coverage */}
        {worstECStudents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Студенты с худшим EC/BV покрытием
              </CardTitle>
              <CardDescription>Среднее покрытие ниже 60%</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Студент</TableHead>
                    <TableHead>Группа</TableHead>
                    <TableHead className="text-center">Ср. EC %</TableHead>
                    <TableHead className="text-center">Ср. BV %</TableHead>
                    <TableHead className="text-center">Попыток</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {worstECStudents.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.group}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <Progress value={s.avgEC} className="w-16 h-2" />
                          <span className={`text-xs font-bold ${s.avgEC < 30 ? "text-rose-600" : s.avgEC < 50 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}>
                            {s.avgEC}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <Progress value={s.avgBV} className="w-16 h-2" />
                          <span className={`text-xs font-bold ${s.avgBV < 30 ? "text-rose-600" : s.avgBV < 50 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}>
                            {s.avgBV}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{s.attempts}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
