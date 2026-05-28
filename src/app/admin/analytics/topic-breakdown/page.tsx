"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { PrintButton } from "@/components/admin/analytics/print-button";
import { TrendIndicator } from "@/components/admin/analytics/trend-indicator";
import { AnalyticsFilterBar, type FilterState } from "@/components/admin/analytics/analytics-filter-bar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface TopicData {
  topic: string;
  avgScore: number;
  avgEcCoverage: number;
  avgBvCoverage: number;
  avgTimeSpent: number;
  attemptsCount: number;
  trend: "improving" | "declining" | "stable";
}

interface SubtopicData {
  id: string;
  name: string;
  missRate: number;
  attempts: number;
}

interface TimePerTopicData {
  date: string;
  totalTime: number;
  avgScore: number;
}

interface TopicBreakdownData {
  topics: TopicData[];
  subtopics: Record<string, SubtopicData[]>;
  timePerTopic: Record<string, TimePerTopicData[]>;
}

export default function TopicBreakdownPage() {
  const [data, setData] = useState<TopicBreakdownData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const fetchData = async (params: Partial<FilterState> = {}) => {
    setLoading(true);
    setError(null);
    const entries = Object.entries(params).filter(([, v]) => v) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    try {
      const r = await fetch(`/api/admin/analytics/topic-breakdown${qs ? `?${qs}` : ""}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic); else next.add(topic);
      return next;
    });
  };

  const timeData = data ? Object.entries(data.timePerTopic).flatMap(([topic, entries]) =>
    entries.map((e) => ({ ...e, topic }))
  ) : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/analytics">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Назад</Button>
          </Link>
          <h1 className="text-xl font-bold">Анализ тем</h1>
          <PrintButton label="Печать" />
        </div>

        <AnalyticsFilterBar onFilterChange={(filters) => fetchData(filters)} />

        {loading && <div className="text-center py-8">Загрузка...</div>}

        {error && !loading && (
          <Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card>
        )}

        {!loading && !data && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Нет данных</CardContent></Card>
        )}

        {!loading && data && (
          <>
            {/* Topics Table */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Темы ({data.topics.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 w-8"></th>
                      <th className="text-left p-2">Тема</th>
                      <th className="text-right p-2">Ср. балл</th>
                      <th className="text-right p-2">EC</th>
                      <th className="text-right p-2">BV</th>
                      <th className="text-right p-2">Ср. время</th>
                      <th className="text-right p-2">Попытки</th>
                      <th className="text-right p-2">Тренд</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topics.map((t) => {
                      const isExpanded = expandedTopics.has(t.topic);
                      const subtopics = data.subtopics[t.topic] || [];
                      return (
                        <tr key={t.topic}>
                          <td className="p-2">
                            <button onClick={() => toggleTopic(t.topic)} aria-label={`Показать детали темы ${t.topic}`} className="p-1 hover:bg-muted rounded">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="p-2 font-medium">{t.topic}</td>
                          <td className="p-2 text-right">
                            <Badge variant={t.avgScore >= 75 ? "default" : t.avgScore >= 50 ? "secondary" : "destructive"}>{t.avgScore}%</Badge>
                          </td>
                          <td className="p-2 text-right">{t.avgEcCoverage}%</td>
                          <td className="p-2 text-right">{t.avgBvCoverage}%</td>
                          <td className="p-2 text-right">{Math.round(t.avgTimeSpent / 60)}м</td>
                          <td className="p-2 text-right">{t.attemptsCount}</td>
                          <td className="p-2 text-right"><TrendIndicator trend={t.trend} compact /></td>
                          {isExpanded && subtopics.length > 0 && (
                            <tr className="col-span-8">
                              <td colSpan={8} className="p-0">
                                <div className="bg-muted/30 p-3 ml-8">
                                  <div className="text-xs font-medium mb-2">Классы эквивалентности</div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {subtopics.map((st) => (
                                      <div key={st.id} className="border rounded p-2 text-xs">
                                        <div className="font-medium truncate">{st.name}</div>
                                        <div className="mt-1">
                                          Пропуск: <Badge variant={st.missRate > 50 ? "destructive" : "secondary"}>{st.missRate}%</Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Time Spent per Topic */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Время по темам</CardTitle></CardHeader>
              <CardContent>
                {timeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={timeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalTime" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Время (мин)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Нет данных</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
