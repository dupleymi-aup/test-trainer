"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Award } from "lucide-react";
import { PrintButton } from "@/components/admin/analytics/print-button";
import { AnalyticsFilterBar } from "@/components/admin/analytics/analytics-filter-bar";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

interface TimelineData {
  student: { id: string; name: string | null; email: string | null; university: string | null; group: string | null; createdAt: string };
  attempts: Array<{ id: string; taskId: string; taskName: string; score: number; ecCoverage: number; bvCoverage: number; timeSpent: number; date: string }>;
  scoreTrajectory: Array<{ index: number; score: number; ecCoverage: number; bvCoverage: number; date: string }>;
  milestones: Array<{ label: string; index: number; score: number; date: string }>;
  topicProgression: Array<{ topic: string; avgScore: number; attempts: number }>;
}

export default function StudentTimelinePage() {
  const searchParams = useSearchParams();
  const preselectedStudent = searchParams.get("studentId");

  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = async (studentId: string) => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/analytics/student-timeline?studentId=${studentId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (preselectedStudent) fetchTimeline(preselectedStudent);
  }, [preselectedStudent]);

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
          <h1 className="text-xl font-bold">Траектория студента</h1>
          <PrintButton label="Печать" />
        </div>

        <AnalyticsFilterBar
          onFilterChange={() => {}}
        />

        {loading && <div className="text-center py-8">Загрузка...</div>}

        {error && !loading && (
          <Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card>
        )}

        {!loading && !data && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Выберите студента для просмотра траектории
            </CardContent>
          </Card>
        )}

        {!loading && data && (
          <>
            {/* Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{data.student.name || data.student.email}</h3>
                    <p className="text-sm text-muted-foreground">
                      {data.student.group}{data.student.university ? ` • ${data.student.university}` : ""}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Score Trajectory */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Динамика баллов и покрытия</CardTitle></CardHeader>
              <CardContent>
                {data.scoreTrajectory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.scoreTrajectory}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                      <YAxis className="text-xs" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} name="Балл" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="ecCoverage" stroke="#10b981" strokeWidth={1.5} name="EC" dot={false} />
                      <Line type="monotone" dataKey="bvCoverage" stroke="#f59e0b" strokeWidth={1.5} name="BV" dot={false} />
                      <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="5 5" label="Цель 75%" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Нет данных</p>
                )}
              </CardContent>
            </Card>

            {/* Milestones */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Вехи</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {data.milestones.map((m, i) => (
                    <Badge key={i} variant={m.label === "Лучший результат" ? "default" : "secondary"} className="flex items-center gap-1">
                      {m.label === "Лучший результат" ? <Award className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                      {m.label}: {m.score}% ({m.date})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Topic Progression */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Прогресс по темам</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {data.topicProgression.map((tp) => (
                    <div key={tp.topic} className="border rounded-lg p-3 text-center">
                      <div className="text-sm font-medium">{tp.topic}</div>
                      <div className="text-2xl font-bold mt-1">{tp.avgScore}%</div>
                      <div className="text-xs text-muted-foreground">{tp.attempts} попыток</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Attempt History */}
            <Card>
              <CardHeader><CardTitle className="text-sm">История попыток ({data.attempts.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Дата</th>
                        <th className="text-left p-2">Задача</th>
                        <th className="text-right p-2">Балл</th>
                        <th className="text-right p-2">EC</th>
                        <th className="text-right p-2">BV</th>
                        <th className="text-right p-2">Время</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data.attempts].reverse().map((a) => (
                        <tr key={a.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{a.date}</td>
                          <td className="p-2 font-medium">{a.taskName}</td>
                          <td className="p-2 text-right">
                            <Badge variant={a.score >= 75 ? "default" : a.score >= 50 ? "secondary" : "destructive"}>{a.score}%</Badge>
                          </td>
                          <td className="p-2 text-right">{a.ecCoverage}%</td>
                          <td className="p-2 text-right">{a.bvCoverage}%</td>
                          <td className="p-2 text-right">{formatTime(a.timeSpent)}</td>
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
