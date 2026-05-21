"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { PrintButton } from "@/components/admin/analytics/print-button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from "recharts";

interface TaskDetail {
  taskId: string;
  taskName: string;
  difficulty: string;
  topics: string[];
  metrics: {
    avgScore: number; minScore: number; maxScore: number; median: number;
    failRate: number; avgTime: number; avgEc: number; avgBv: number;
    avgCorrectness: number; totalAttempts: number; uniqueStudents: number;
  };
  distribution: Record<string, number>;
  commonMistakes: Array<{ id: string; name: string; missRate: number }>;
  trend: Array<{ date: string; avgScore: number; attempts: number }>;
  strugglingStudents: Array<{ studentId: string; name: string; group: string; avgScore: number; attempts: number }>;
}

export default function TaskDetailPage() {
  const [data, setData] = useState<TaskDetail[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const fetchData = async (taskId?: string) => {
    setLoading(true);
    const qs = taskId ? `?taskId=${taskId}` : "";
    try {
      const r = await fetch(`/api/admin/analytics/task-detail${qs}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleTask = (id: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    return m > 0 ? `${m}м` : `${seconds}с`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/analytics">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Назад</Button>
          </Link>
          <h2 className="text-xl font-bold">Детальный анализ задач</h2>
          <PrintButton label="Печать" />
        </div>

        {loading && <div className="text-center py-8">Загрузка...</div>}

        {!loading && !data && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Нет данных</CardContent></Card>
        )}

        {!loading && data && (
          <>
            {/* Task Cards */}
            <div className="space-y-3">
              {data.map((t) => {
                const isExpanded = expandedTasks.has(t.taskId);
                const distData = Object.entries(t.distribution).map(([range, count]) => ({ range, count }));
                return (
                  <Card key={t.taskId}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button onClick={() => toggleTask(t.taskId)} className="p-1 hover:bg-muted rounded">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          <div>
                            <CardTitle className="text-base">{t.taskName}</CardTitle>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">{t.difficulty}</Badge>
                              {t.topics.map((topic) => <Badge key={topic} variant="secondary">{topic}</Badge>)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Ср. балл</div>
                            <Badge variant={t.metrics.avgScore >= 75 ? "default" : t.metrics.avgScore >= 50 ? "secondary" : "destructive"}>{t.metrics.avgScore}%</Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Попытки</div>
                            <div className="font-bold">{t.metrics.totalAttempts}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Fail Rate</div>
                            <div className={t.metrics.failRate > 50 ? "text-rose-600 font-bold" : "font-bold"}>{t.metrics.failRate}%</div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="space-y-4 pt-2">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          <div className="border rounded p-2 text-center"><div className="text-xs text-muted-foreground">Min</div><div className="font-bold">{t.metrics.minScore}%</div></div>
                          <div className="border rounded p-2 text-center"><div className="text-xs text-muted-foreground">Median</div><div className="font-bold">{t.metrics.median}%</div></div>
                          <div className="border rounded p-2 text-center"><div className="text-xs text-muted-foreground">Max</div><div className="font-bold">{t.metrics.maxScore}%</div></div>
                          <div className="border rounded p-2 text-center"><div className="text-xs text-muted-foreground">Ср. EC</div><div className="font-bold">{t.metrics.avgEc}%</div></div>
                          <div className="border rounded p-2 text-center"><div className="text-xs text-muted-foreground">Ср. BV</div><div className="font-bold">{t.metrics.avgBv}%</div></div>
                          <div className="border rounded p-2 text-center"><div className="text-xs text-muted-foreground">Ср. время</div><div className="font-bold">{formatTime(t.metrics.avgTime)}</div></div>
                        </div>

                        {/* Distribution Chart */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Распределение баллов</h4>
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={distData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="range" className="text-xs" />
                                <YAxis className="text-xs" />
                                <Tooltip />
                                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Common Mistakes */}
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><AlertCircle className="h-3 w-3 text-rose-600" /> Типичные ошибки</h4>
                            {t.commonMistakes.length > 0 ? (
                              t.commonMistakes.map((m) => (
                                <div key={m.id} className="mb-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="truncate">{m.name}</span>
                                    <Badge variant={m.missRate > 50 ? "destructive" : "secondary"}>{m.missRate}%</Badge>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">Нет данных</p>
                            )}
                          </div>
                        </div>

                        {/* Trend */}
                        {t.trend.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Динамика по дням</h4>
                            <ResponsiveContainer width="100%" height={200}>
                              <LineChart data={t.trend}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                                <YAxis className="text-xs" domain={[0, 100]} />
                                <Tooltip />
                                <Line type="monotone" dataKey="avgScore" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Struggling Students */}
                        {t.strugglingStudents.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2 text-rose-600">Студенты с трудностями</h4>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-1">Студент</th>
                                  <th className="text-left p-1">Группа</th>
                                  <th className="text-right p-1">Ср. балл</th>
                                  <th className="text-right p-1">Попытки</th>
                                </tr>
                              </thead>
                              <tbody>
                                {t.strugglingStudents.map((s) => (
                                  <tr key={s.studentId} className="border-b">
                                    <td className="p-1">
                                      <Link href={`/admin/analytics/student/${s.studentId}`} className="text-primary hover:underline">{s.name}</Link>
                                    </td>
                                    <td className="p-1">{s.group}</td>
                                    <td className="p-1 text-right">
                                      <Badge variant="destructive">{s.avgScore}%</Badge>
                                    </td>
                                    <td className="p-1 text-right">{s.attempts}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
