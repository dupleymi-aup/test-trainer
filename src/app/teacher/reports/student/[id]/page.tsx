"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, TrendingUp, TrendingDown, Minus, Award, AlertCircle } from "lucide-react";
import Link from "next/link";
import { logger } from "@/lib/logger";
import {
  LineChart,
  Line,
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

interface ReportData {
  student: {
    id: string;
    name: string | null;
    email: string | null;
    group: string | null;
    university: string | null;
    createdAt: string;
  };
  stats: {
    bestScore: number;
    avgScore: number;
    avgEc: number;
    avgBv: number;
    avgCorrectness: number;
    totalAttempts: number;
    avgTimeSpent: number;
  };
  attempts: Array<{
    id: string;
    taskId: string;
    score: number;
    ecCoverage: number;
    bvCoverage: number;
    correctness: number;
    timeSpent: number;
    createdAt: string;
  }>;
  scoresOverTime: Array<{
    date: string;
    score: number;
    ecCoverage: number;
    bvCoverage: number;
  }>;
  taskPerformance: Array<{
    taskId: string;
    taskName: string;
    bestScore: number;
    attemptsCount: number;
    avgEc: number;
    avgBv: number;
    trend: "improving" | "stable" | "declining";
  }>;
  weakAreas: Array<{
    topic: string;
    avgScore: number;
    taskCount: number;
  }>;
  strongAreas: Array<{
    topic: string;
    avgScore: number;
    taskCount: number;
  }>;
  groupPercentile: number;
  recommendations: string[];
}

export default function StudentReportCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    params.then(({ id }) => {
      if (controller.signal.aborted) return;
      fetch(`/api/teacher/reports/student/${id}/report-card`, { signal: controller.signal })
        .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((d) => { if (!controller.signal.aborted) { setData(d); setLoading(false); } })
        .catch((err) => { if (!controller.signal.aborted) { logger.error("Failed to load report card", err); setLoading(false); } });
    });
    return () => controller.abort();
  }, [params]);

  const handlePrint = () => {
    window.print();
  };

  if (loading)
    return (
      <TeacherLayout>
        <div className="p-8 text-center">Загрузка...</div>
      </TeacherLayout>
    );

  if (!data)
    return (
      <TeacherLayout>
        <div className="p-8 text-center">Не найдено</div>
      </TeacherLayout>
    );

  const getTrendIcon = (trend: string) => {
    if (trend === "improving")
      return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (trend === "declining")
      return <TrendingDown className="h-4 w-4 text-rose-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const chartData = data.scoresOverTime.map((entry, i) => ({
    attempt: `#${i + 1}`,
    score: entry.score,
    ec: entry.ecCoverage,
    bv: entry.bvCoverage,
  }));

  return (
    <TeacherLayout>
      <div className="space-y-6 print-report">
        {/* Actions bar - hidden in print */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <Link href="/teacher/reports/group-performance">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Назад
              </Button>
            </Link>
          </div>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Печать отчёта
          </Button>
        </div>

        {/* Student Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {data.student.name || data.student.email}
                </h2>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {data.student.group && (
                    <p>Группа: {data.student.group}</p>
                  )}
                  {data.student.university && (
                    <p>Университет: {data.student.university}</p>
                  )}
                  <p>
                    Дата регистрации:{" "}
                    {new Date(data.student.createdAt).toLocaleDateString(
                      "ru-RU"
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Дата отчёта</p>
                <p className="font-bold">
                  {new Date().toLocaleDateString("ru-RU")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">
                {data.stats.bestScore}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Лучший балл
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{data.stats.avgScore}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Средний балл
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{data.stats.avgEc}%</p>
              <p className="text-xs text-muted-foreground mt-1">Ср. EC</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{data.stats.avgBv}%</p>
              <p className="text-xs text-muted-foreground mt-1">Ср. BV</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-lg font-bold">{data.stats.totalAttempts}</p>
              <p className="text-xs text-muted-foreground">Всего попыток</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-lg font-bold">
                {Math.round(data.stats.avgTimeSpent)}с
              </p>
              <p className="text-xs text-muted-foreground">Ср. время</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-lg font-bold">{data.stats.avgCorrectness}%</p>
              <p className="text-xs text-muted-foreground">Корректность</p>
            </CardContent>
          </Card>
        </div>

        {/* Score Trend Chart */}
        {chartData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Динамика результатов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="attempt" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Балл"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ec"
                    stroke="hsl(var(--chart-1, 12 76% 61%))"
                    strokeWidth={1.5}
                    name="EC"
                    strokeDasharray="5 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="bv"
                    stroke="hsl(var(--chart-2, 173 58% 39%))"
                    strokeWidth={1.5}
                    name="BV"
                    strokeDasharray="5 3"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Task Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Выполнение заданий</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Задание</TableHead>
                  <TableHead className="text-right">Лучший балл</TableHead>
                  <TableHead className="text-right">Попытки</TableHead>
                  <TableHead className="text-right">Ср. EC</TableHead>
                  <TableHead className="text-right">Ср. BV</TableHead>
                  <TableHead>Тренд</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.taskPerformance.map((task) => (
                  <TableRow key={task.taskId}>
                    <TableCell className="font-medium">{task.taskName}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          task.bestScore >= 75
                            ? "default"
                            : task.bestScore >= 50
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {task.bestScore}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {task.attemptsCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <Progress value={task.avgEc} className="h-1.5 w-16" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Progress value={task.avgBv} className="h-1.5 w-16" />
                    </TableCell>
                    <TableCell>{getTrendIcon(task.trend)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Weak & Strong Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                Зоны роста
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.weakAreas.map((area) => (
                  <div key={area.topic} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{area.topic}</p>
                      <Progress value={area.avgScore} className="h-1.5 mt-1" />
                    </div>
                    <span className="text-sm font-bold text-rose-600">
                      {area.avgScore}%
                    </span>
                  </div>
                ))}
                {data.weakAreas.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Нет слабых зон
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-600" />
                Сильные стороны
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.strongAreas.map((area) => (
                  <div key={area.topic} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{area.topic}</p>
                      <Progress value={area.avgScore} className="h-1.5 mt-1" />
                    </div>
                    <span className="text-sm font-bold text-emerald-600">
                      {area.avgScore}%
                    </span>
                  </div>
                ))}
                {data.strongAreas.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Нет данных
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Group Ranking */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Ранг в группе
                </p>
                <p className="text-3xl font-bold">
                  Топ {100 - data.groupPercentile}%
                </p>
              </div>
              <div className="w-48">
                <Progress value={data.groupPercentile} className="h-3" />
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Перцентиль: {data.groupPercentile}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              Рекомендации
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary font-bold">{i + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
              {data.recommendations.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  Студент показывает отличные результаты!
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          .print-report {
            padding: 0 !important;
          }
          .print-report .print\\:hidden {
            display: none !important;
          }
          .print-report header,
          .print-report nav,
          .print-report button {
            display: none !important;
          }
          .print-report .max-w-7xl {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-report .bg-gray-50,
          .print-report .dark\\:bg-gray-950 {
            background: white !important;
          }
          .print-report .border-b {
            border: none !important;
          }
          .print-report .space-y-6 > * + * {
            margin-top: 1rem !important;
          }
          .print-report .gap-6 {
            gap: 1rem !important;
          }
          .print-report .min-w-0 {
            min-width: auto !important;
          }
          @page {
            margin: 2cm;
          }
        }
      `}</style>
    </TeacherLayout>
  );
}
