"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, LineChart as LineChartIcon } from "lucide-react";
import { PrintButton } from "@/components/admin/analytics/print-button";
import { AnalyticsFilterBar } from "@/components/admin/analytics/analytics-filter-bar";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ReferenceLine,
} from "recharts";

interface ForecastEntry {
  studentId: string;
  name: string;
  group: string;
  university: string;
  currentAvg: number;
  predictedNext: number;
  confidence: number;
  confidenceLevel: "high" | "medium" | "low";
  trend: "improving" | "declining" | "stable";
}

interface ForecastData {
  forecasts: ForecastEntry[];
  totalStudents: number;
  forecastedCount: number;
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4 text-rose-600" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
}

function ConfidenceBadge({ level }: { level: string }) {
  const colors = { high: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", low: "bg-rose-100 text-rose-700" };
  const labels = { high: "Высокая", medium: "Средняя", low: "Низкая" };
  return <Badge className={colors[level as keyof typeof colors]}>{labels[level as keyof typeof labels]}</Badge>;
}

export default function ForecastingPage() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterConfidence, setFilterConfidence] = useState<string>("all");

  const fetchData = async (params: Record<string, string> = {}) => {
    setLoading(true);
    const qs = new URLSearchParams(params).toString();
    try {
      const r = await fetch(`/api/admin/analytics/forecasting${qs ? `?${qs}` : ""}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredForecasts = data?.forecasts.filter((f) =>
    filterConfidence === "all" || f.confidenceLevel === filterConfidence
  ) || [];

  const decliningStudents = data?.forecasts.filter((f) => f.trend === "declining") || [];

  const chartData = data?.forecasts.slice(0, 30).map((f) => ({
    name: f.name || f.studentId.slice(0, 6),
    current: f.currentAvg,
    predicted: f.predictedNext,
    confidence: f.confidence,
    trend: f.trend,
  })) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/analytics">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Назад</Button>
          </Link>
          <h2 className="text-xl font-bold flex items-center gap-2"><LineChartIcon className="h-5 w-5" /> Прогнозирование успеваемости</h2>
          <PrintButton label="Печать" />
        </div>

        <AnalyticsFilterBar onFilterChange={(filters) => fetchData(filters)} />

        {loading && <div className="text-center py-8">Загрузка...</div>}

        {!loading && !data && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Нет данных</CardContent></Card>
        )}

        {!loading && data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Всего студентов</div><div className="text-2xl font-bold">{data.totalStudents}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">С прогнозом</div><div className="text-2xl font-bold">{data.forecastedCount}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground text-rose-600">Снижение</div><div className="text-2xl font-bold text-rose-600">{decliningStudents.length}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground text-emerald-600">Рост</div><div className="text-2xl font-bold text-emerald-600">{data.forecasts.filter((f) => f.trend === "improving").length}</div></CardContent></Card>
            </div>

            {/* Scatter Chart */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Текущий vs прогнозируемый балл</CardTitle></CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="current" type="number" name="Текущий" className="text-xs" domain={[0, 100]} />
                      <YAxis dataKey="predicted" type="number" name="Прогноз" className="text-xs" domain={[0, 100]} />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                      <Legend />
                      <ReferenceLine x={75} stroke="#ef4444" strokeDasharray="5 5" label="Цель 75%" />
                      <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="5 5" />
                      <Scatter name="Студенты" data={chartData} fill="hsl(var(--primary))" r={(d: { confidence: number }) => Math.max(3, d.confidence / 15)} />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Нет данных</p>
                )}
              </CardContent>
            </Card>

            {/* Forecast Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Прогнозы по студентам</CardTitle>
                <div className="flex gap-2">
                  {["all", "high", "medium", "low"].map((level) => (
                    <Button
                      key={level}
                      variant={filterConfidence === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterConfidence(level)}
                    >
                      {level === "all" ? "Все" : level === "high" ? "Высокая" : level === "medium" ? "Средняя" : "Низкая"}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 sticky top-0">
                        <th className="text-left p-2">Студент</th>
                        <th className="text-left p-2">Группа</th>
                        <th className="text-right p-2">Текущий</th>
                        <th className="text-right p-2">Прогноз</th>
                        <th className="text-right p-2">Изменение</th>
                        <th className="text-right p-2">Уверенность</th>
                        <th className="text-right p-2">Тренд</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredForecasts.map((f) => (
                        <tr key={f.studentId} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{f.name}</td>
                          <td className="p-2 text-sm">{f.group}</td>
                          <td className="p-2 text-right">
                            <Badge variant={f.currentAvg >= 75 ? "default" : f.currentAvg >= 50 ? "secondary" : "destructive"}>{f.currentAvg}%</Badge>
                          </td>
                          <td className="p-2 text-right">
                            <Badge variant={f.predictedNext >= 75 ? "default" : f.predictedNext >= 50 ? "secondary" : "destructive"}>{f.predictedNext}%</Badge>
                          </td>
                          <td className="p-2 text-right">
                            <span className={f.predictedNext - f.currentAvg > 0 ? "text-emerald-600" : f.predictedNext - f.currentAvg < 0 ? "text-rose-600" : ""}>
                              {f.predictedNext - f.currentAvg > 0 ? "+" : ""}{f.predictedNext - f.currentAvg}%
                            </span>
                          </td>
                          <td className="p-2 text-right"><ConfidenceBadge level={f.confidenceLevel} /></td>
                          <td className="p-2 text-right"><TrendIcon trend={f.trend} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
