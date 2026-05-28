"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Line,
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
import { ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { AnalyticsFilterBar, FilterState } from "@/components/admin/analytics/analytics-filter-bar";

interface TaskInsightsData {
  taskInsights: Array<{
    taskId: string;
    taskName: string;
    difficulty: string;
    actualDifficulty: string;
    difficultyAccurate: boolean;
    attemptsCount: number;
    avgScore: number;
    avgEc: number;
    avgBv: number;
    avgCorrectness: number;
    avgTimeSpent: number;
    failRate: number;
    scoreDistribution: Record<string, number>;
    topCategories: Array<{ category: string; count: number }>;
    topics: string[];
    totalEcs: number;
    totalBvs: number;
  }>;
  topicPerformance: Array<{ topic: string; avgScore: number; avgEc: number; avgBv: number; taskCount: number }>;
}

const difficultyColors: Record<string, string> = {
  "Легко": "bg-green-100 text-green-800",
  "Средне": "bg-amber-100 text-amber-800",
  "Сложно": "bg-rose-100 text-rose-800",
};

export default function TaskInsightsPage() {
  const [data, setData] = useState<TaskInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);
    if (filters?.groupId) params.set("groupId", filters.groupId);
    const qs = params.toString();
    fetch(`/api/admin/analytics/task-insights${qs ? `?${qs}` : ""}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filters]);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки данных</div></AdminLayout>;

  const scoreBadge = (score: number) => (
    <Badge variant={score >= 75 ? "default" : score >= 50 ? "secondary" : "destructive"}>{score}%</Badge>
  );

  const difficultyBarData = data.taskInsights.map((t) => ({
    name: t.taskName.length > 15 ? t.taskName.slice(0, 15) + "..." : t.taskName,
    avgScore: t.avgScore,
    failRate: t.failRate,
    attempts: t.attemptsCount,
  }));

  const radarData = data.topicPerformance.map((t) => ({
    topic: t.topic.length > 20 ? t.topic.slice(0, 20) + "..." : t.topic,
    avgScore: t.avgScore,
    avgEc: t.avgEc,
    avgBv: t.avgBv,
  }));

  const sortedByFailRate = [...data.taskInsights].sort((a, b) => b.failRate - a.failRate).slice(0, 10);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Анализ задач</h1>
          <Link href="/admin/analytics" className="text-sm text-muted-foreground hover:text-foreground">
            Все отчёты <ArrowRight className="inline h-3 w-3 ml-1" />
          </Link>
        </div>

        <AnalyticsFilterBar onFilterChange={setFilters} showGroupFilter />

        {/* Task Difficulty Chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Средний балл и процент отказов по задачам</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={difficultyBarData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis yAxisId="left" domain={[0, 100]} className="text-xs" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="avgScore" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Ср. балл" />
                <Line yAxisId="right" type="monotone" dataKey="failRate" stroke="hsl(var(--destructive))" strokeWidth={2} name="Отказы %" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Topic Radar + Task Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Производительность по темам</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid className="stroke-muted" />
                  <PolarAngleAxis dataKey="topic" className="text-xs" />
                  <PolarRadiusAxis domain={[0, 100]} className="text-xs" />
                  <Radar name="Балл" dataKey="avgScore" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Задачи с максимальным процентом отказов</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Задача</TableHead><TableHead className="text-right">Сложность</TableHead><TableHead className="text-right">Отказы</TableHead><TableHead className="text-right">Ср. балл</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {sortedByFailRate.map((t) => (
                    <TableRow key={t.taskId}>
                      <TableCell className="font-medium">{t.taskName}</TableCell>
                      <TableCell className="text-right">
                        <span className={`px-2 py-0.5 rounded text-xs ${difficultyColors[t.difficulty] || ""}`}>{t.difficulty}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{t.failRate}%</Badge>
                      </TableCell>
                      <TableCell className="text-right">{scoreBadge(t.avgScore)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Difficulty Accuracy + Top Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Соответствие сложности</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Задача</TableHead><TableHead className="text-right">Заявленная</TableHead><TableHead className="text-right">Фактическая</TableHead><TableHead className="text-right">Точность</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {data.taskInsights.map((t) => (
                    <TableRow key={t.taskId}>
                      <TableCell className="font-medium">{t.taskName}</TableCell>
                      <TableCell className="text-right">
                        <span className={`px-2 py-0.5 rounded text-xs ${difficultyColors[t.difficulty] || ""}`}>{t.difficulty}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`px-2 py-0.5 rounded text-xs ${difficultyColors[t.actualDifficulty] || ""}`}>{t.actualDifficulty}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {t.difficultyAccurate ? <CheckCircle className="h-4 w-4 text-green-600 inline" /> : <XCircle className="h-4 w-4 text-rose-600 inline" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Детализация задач</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Задача</TableHead><TableHead className="text-right">EC</TableHead><TableHead className="text-right">BV</TableHead><TableHead className="text-right">Время (с)</TableHead><TableHead className="text-right">Попытки</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {data.taskInsights.slice(0, 10).map((t) => (
                    <TableRow key={t.taskId}>
                      <TableCell className="font-medium">{t.taskName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={t.avgEc} className="h-2 w-12" />
                          <span className="text-xs">{t.avgEc}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={t.avgBv} className="h-2 w-12" />
                          <span className="text-xs">{t.avgBv}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{t.avgTimeSpent}</TableCell>
                      <TableCell className="text-right">{t.attemptsCount}</TableCell>
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
