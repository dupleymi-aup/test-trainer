"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts";
import { PrintButton } from "@/components/admin/analytics/print-button";
import { Clock, Sun, Moon, Sunset, Sunrise, TrendingUp, Calendar, Timer } from "lucide-react";

interface HeatmapPoint {
  day: string;
  dayIndex: number;
  hour: number;
  hourLabel: string;
  count: number;
  avgScore: number;
}

interface ActivityTimeData {
  heatmapData: HeatmapPoint[];
  peakHours: Array<{ hour: number; hourLabel: string; count: number }>;
  peakDays: Array<{ day: string; dayIndex: number; count: number; totalScore: number }>;
  segmentAnalysis: Array<{ key: string; label: string; count: number; pct: number; avgScore: number; avgTimeSeconds: number }>;
  trendChartData: Array<{ date: string; attempts: number; avgScore: number }>;
  summary: { totalAttempts: number; peakHour: string; peakDay: string; mostActiveSegment: string };
}

const segmentIcons: Record<string, typeof Sun> = {
  night: Moon,
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
};

const segmentColors: Record<string, string> = {
  night: "#6366f1",
  morning: "#f59e0b",
  afternoon: "#f97316",
  evening: "#8b5cf6",
};

const dayNamesShort = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function getHeatmapColor(value: number, max: number): string {
  if (max === 0) return "transparent";
  const intensity = value / max;
  if (intensity > 0.8) return "#1d4ed8";
  if (intensity > 0.6) return "#3b82f6";
  if (intensity > 0.4) return "#60a5fa";
  if (intensity > 0.2) return "#93c5fd";
  if (intensity > 0.1) return "#dbeafe";
  return "#eff6ff";
}

export default function ActivityTimePage() {
  const [data, setData] = useState<ActivityTimeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics/activity-time")
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки</div></AdminLayout>;

  const maxCount = Math.max(...data.heatmapData.map((d) => d.count), 1);

  // Build heatmap table: 7 days × 24 hours
  const heatmapMatrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const d of data.heatmapData) {
    heatmapMatrix[d.dayIndex][d.hour] = d.count;
  }

  const dayChartData = data.peakDays.map((d) => ({
    day: d.day,
    attempts: d.count,
    avgScore: d.count > 0 ? Math.round(d.totalScore / d.count) : 0,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Активность по времени</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Heatmap по часам и дням, пики активности, периоды суток
            </p>
          </div>
          <PrintButton />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-blue-600" /><span className="text-xs text-muted-foreground">Всего попыток</span></div>
              <p className="text-2xl font-bold">{data.summary.totalAttempts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Timer className="h-4 w-4 text-emerald-600" /><span className="text-xs text-muted-foreground">Пиковый час</span></div>
              <p className="text-2xl font-bold">{data.summary.peakHour}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">Пиковый день</span></div>
              <p className="text-2xl font-bold text-sm">{data.summary.peakDay}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-amber-600" /><span className="text-xs text-muted-foreground">Активный период</span></div>
              <p className="text-2xl font-bold text-sm">{data.summary.mostActiveSegment}</p>
            </CardContent>
          </Card>
        </div>

        {/* Time segments */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Активность по периодам суток</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {data.segmentAnalysis.map((seg) => {
                const Icon = segmentIcons[seg.key] || Clock;
                const color = segmentColors[seg.key] || "#6366f1";
                return (
                  <div key={seg.key} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" style={{ color }} />
                      <span className="font-bold text-sm">{seg.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Доля</span>
                      <span className="font-bold">{seg.pct}%</span>
                    </div>
                    <Progress value={seg.pct} className="h-2" />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Ср. балл</p>
                        <p className="font-bold text-lg">{seg.avgScore}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ср. время</p>
                        <p className="font-bold text-lg">{Math.round(seg.avgTimeSeconds / 60)} мин</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{seg.count} попыток</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Heatmap table */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Heatmap: день × час</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-1 text-muted-foreground w-16"></th>
                    {Array.from({ length: 24 }, (_, h) => (
                      <th key={h} className="p-1 text-center text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 7 }, (_, day) => (
                    <tr key={day}>
                      <td className="p-1 font-bold text-muted-foreground">{dayNamesShort[day]}</td>
                      {Array.from({ length: 24 }, (_, hour) => {
                        const count = heatmapMatrix[day][hour];
                        return (
                          <td
                            key={hour}
                            className="p-0.5 text-center rounded-sm"
                            style={{ backgroundColor: getHeatmapColor(count, maxCount) }}
                            title={`${dayNamesShort[day]} ${hour}:00 — ${count} попыток`}
                          >
                            {count > 0 ? (
                              <span className="block w-full py-1" style={{ color: count > maxCount * 0.5 ? "white" : "inherit" }}>
                                {count}
                              </span>
                            ) : (
                              <span className="block w-full py-1 text-muted-foreground/30">·</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Activity by day of week */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Активность по дням недели</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dayChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis yAxisId="left" allowDecimals={false} className="text-xs" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="attempts" fill="hsl(var(--primary))" name="Попытки" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="avgScore" fill="#10b981" name="Ср. балл %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily trend */}
        {data.trendChartData.length > 1 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Тренд активности (30 дней)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" allowDecimals={false} className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="attempts" stroke="hsl(var(--primary))" strokeWidth={2} name="Попытки" dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="avgScore" stroke="#10b981" strokeWidth={2} name="Ср. балл %" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Peak hours */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Топ-5 пиковых часов</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.peakHours.map((h, i) => (
                <div key={h.hour} className="flex items-center gap-3">
                  <Badge className="w-8 h-8 rounded-full flex items-center justify-center">{i + 1}</Badge>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{h.hourLabel}</span>
                      <span className="font-bold">{h.count} попыток</span>
                    </div>
                    <Progress value={(h.count / data.peakHours[0].count) * 100} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
