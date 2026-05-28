"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AnalyticsFilterBar, FilterState } from "@/components/admin/analytics/analytics-filter-bar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Clock, TrendingUp, Sun, Moon, Sunrise, Sunset, Activity } from "lucide-react";

interface HeatmapCell {
  hour: number;
  day: number;
  count: number;
  avgScore: number;
  avgTime: number;
}

interface HourlyData {
  hour: number;
  attempts: number;
  avgScore: number;
  avgTime: number;
}

interface DailyData {
  day: number;
  name: string;
  attempts: number;
  avgScore: number;
  avgTime: number;
  uniqueStudents: number;
}

interface Summary {
  totalAttempts: number;
  totalStudents: number;
  avgTimePerAttempt: number;
  avgScoreOverall: number;
  mostActiveDay: { name: string; attempts: number };
  mostActiveHour: { label: string; attempts: number };
  bestScoringHour: { label: string; avgScore: number };
  periodStats: Array<{ name: string; attempts: number; percentage: number; avgScore: number; avgTime: number }>;
}

interface TimeActivityData {
  heatmap: HeatmapCell[];
  hourlyDistribution: HourlyData[];
  dailyDistribution: DailyData[];
  topPeakHours: Array<{ hour: number; attempts: number; avgScore: number; label: string }>;
  lowActivityHours: Array<{ hour: number; attempts: number; avgScore: number; label: string }>;
  summary: Summary;
}

function HeatmapCellComponent({ cell }: { cell: HeatmapCell }) {
  const maxCount = Math.max(cell.count, 1);
  const intensity = Math.min(cell.count / Math.max(maxCount * 0.3, 1), 1);

  let bgColor: string;
  if (cell.count === 0) {
    bgColor = "bg-gray-100 dark:bg-gray-800";
  } else if (intensity > 0.7) {
    bgColor = "bg-blue-600";
  } else if (intensity > 0.4) {
    bgColor = "bg-blue-400";
  } else if (intensity > 0.1) {
    bgColor = "bg-blue-200 dark:bg-blue-800";
  } else {
    bgColor = "bg-blue-100 dark:bg-blue-900";
  }

  const textColor = intensity > 0.4 ? "text-white" : "text-gray-900 dark:text-gray-100";

  return (
    <div
      className={`${bgColor} ${textColor} rounded p-1 text-center text-xs min-w-[48px] min-h-[36px] flex flex-col items-center justify-center`}
      title={`Попыток: ${cell.count}, Ср. балл: ${cell.avgScore}%, Ср. время: ${cell.avgTime}с`}
    >
      <span className="font-bold">{cell.count}</span>
      {cell.count > 0 && <span className="text-[10px] opacity-75">{cell.avgScore}%</span>}
    </div>
  );
}

const periodIcons: Record<string, React.ReactNode> = {
  "Ночь": <Moon className="h-4 w-4 text-indigo-500" />,
  "Утро": <Sunrise className="h-4 w-4 text-amber-500" />,
  "День": <Sun className="h-4 w-4 text-yellow-500" />,
  "Вечер": <Sunset className="h-4 w-4 text-orange-500" />,
};

export default function TimeActivityPage() {
  const [data, setData] = useState<TimeActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Partial<FilterState>>({});

  const fetchData = (f: Partial<FilterState>) => {
    const params = new URLSearchParams();
    if (f.groupId) params.set("groupId", f.groupId);
    if (f.university) params.set("university", f.university);

    setLoading(true);
    fetch(`/api/admin/analytics/time-activity?${params}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData(filters);
  }, [filters]);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center text-rose-600">Нет данных</div></AdminLayout>;

  const { summary } = data;

  // Prepare heatmap grid: rows = hours, cols = days
  const heatmapGrid: HeatmapCell[][] = Array.from({ length: 24 }, () => Array(7));
  for (const cell of data.heatmap) {
    heatmapGrid[cell.hour][cell.day] = cell;
  }

  // Prepare chart data
  const hourlyChartData = data.hourlyDistribution.map((h) => ({
    hour: `${h.hour}:00`,
    attempts: h.attempts,
    avgScore: h.avgScore,
  }));

  const dailyChartData = data.dailyDistribution.map((d) => ({
    day: d.name,
    attempts: d.attempts,
    avgScore: d.avgScore,
    students: d.uniqueStudents,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Анализ активности по времени</h1>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <AnalyticsFilterBar
              onFilterChange={setFilters}
              showGroupFilter
              showUniversityFilter
            />
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Всего попыток</div>
              <div className="text-2xl font-bold">{summary.totalAttempts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Студентов</div>
              <div className="text-2xl font-bold">{summary.totalStudents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Ср. время</div>
              <div className="text-2xl font-bold">{summary.avgTimePerAttempt}с</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Актив. час
              </div>
              <div className="text-xl font-bold">{summary.mostActiveHour.label}</div>
              <div className="text-xs text-muted-foreground">{summary.mostActiveHour.attempts} попыток</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Лучший балл
              </div>
              <div className="text-xl font-bold">{summary.bestScoringHour.label}</div>
              <div className="text-xs text-muted-foreground">{summary.bestScoringHour.avgScore}% средний</div>
            </CardContent>
          </Card>
        </div>

        {/* Period stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Активность по периодам суток</CardTitle>
            <CardDescription>Распределение попыток и качество по времени суток</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {summary.periodStats.map((p) => {
                const periodKey = p.name.split(" ")[0];
                return (
                  <div key={p.name} className="space-y-2">
                    <div className="flex items-center gap-2">
                      {periodIcons[periodKey] || <Activity className="h-4 w-4" />}
                      <span className="text-sm font-medium">{p.name.split(" ")[0]}</span>
                    </div>
                    <div className="text-2xl font-bold">{p.percentage}%</div>
                    <Progress value={p.percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {p.attempts} попыток · {p.avgScore}% ср. · {p.avgTime}с
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Heatmap: Hour × Day */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Тепловая карта активности</CardTitle>
            <CardDescription>Попытки студентов по часам и дням недели</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[420px]">
                {/* Header row */}
                <div className="flex items-center gap-1 mb-1 pl-12">
                  {data.dailyDistribution.map((d) => (
                    <div key={d.day} className="min-w-[48px] text-center text-xs font-medium text-muted-foreground flex-1">
                      {d.name}
                    </div>
                  ))}
                </div>
                {/* Rows */}
                {heatmapGrid.map((row, hour) => (
                  <div key={hour} className="flex items-center gap-1 mb-0.5">
                    <div className="w-12 text-right text-xs text-muted-foreground pr-1">
                      {hour}:00
                    </div>
                    {row.map((cell, day) => (
                      <div key={day} className="flex-1 min-w-[48px]">
                        <HeatmapCellComponent cell={cell} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts: Hourly + Daily */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Попытки по часам</CardTitle>
              <CardDescription>Количество попыток за каждый час суток</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" className="text-xs" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="attempts" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Попытки по дням недели</CardTitle>
              <CardDescription>Количество попыток и средний балл по дням</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="attempts" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Попытки" />
                  <Bar dataKey="avgScore" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} name="Ср. балл" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Peak hours + Low activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Часы пиковой активности</CardTitle>
              <CardDescription>Топ-5 часов с наибольшим количеством попыток</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Время</TableHead>
                    <TableHead className="text-right">Попытки</TableHead>
                    <TableHead className="text-right">Ср. балл</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topPeakHours.map((p) => (
                    <TableRow key={p.hour}>
                      <TableCell className="font-medium">{p.label}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default">{p.attempts}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.avgScore >= 75 ? "default" : p.avgScore >= 50 ? "secondary" : "destructive"}>
                          {p.avgScore}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Часы низкой активности</CardTitle>
              <CardDescription>Возможное время для обслуживания системы</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Время</TableHead>
                    <TableHead className="text-right">Попытки</TableHead>
                    <TableHead className="text-right">Ср. балл</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lowActivityHours.map((p) => (
                    <TableRow key={p.hour}>
                      <TableCell className="font-medium">{p.label}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{p.attempts}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-muted-foreground">{p.avgScore}%</span>
                      </TableCell>
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
