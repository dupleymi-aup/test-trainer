"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/admin/analytics/print-button";
import { TrendIndicator } from "@/components/admin/analytics/trend-indicator";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

interface StudentComparisonData {
  students: Array<{
    student: { id: string; name: string; group: string; university: string; registeredAt: string };
    metrics: { avgScore: number; bestScore: number; avgEc: number; avgBv: number; avgCorrectness: number; avgTime: number; totalAttempts: number; trend: "improving" | "stable" | "declining" | "none" };
    trajectory: Array<{ attempt: number; score: number; date: string }>;
    taskBreakdown: Array<{ taskId: string; bestScore: number; avgScore: number; attempts: number }>;
  }>;
  count: number;
}

type StudentData = StudentComparisonData["students"][number];

export default function StudentComparisonPage() {
  const [data, setData] = useState<StudentComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentIds, setStudentIds] = useState("");

  const fetchData = async () => {
    if (!studentIds.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/analytics/student-comparison?studentIds=${encodeURIComponent(studentIds.trim())}`);
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status}${body ? `: ${body}` : ""}`);
      }
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    return m > 0 ? `${m}м` : `${seconds}с`;
  };

  const fullRadarData = [
    { metric: "Ср. балл", ...Object.fromEntries(data?.students.map((s) => [s.student.name, s.metrics.avgScore]) || []) },
    { metric: "Лучший", ...Object.fromEntries(data?.students.map((s) => [s.student.name, s.metrics.bestScore]) || []) },
    { metric: "EC", ...Object.fromEntries(data?.students.map((s) => [s.student.name, s.metrics.avgEc]) || []) },
    { metric: "BV", ...Object.fromEntries(data?.students.map((s) => [s.student.name, s.metrics.avgBv]) || []) },
    { metric: "Корректн.", ...Object.fromEntries(data?.students.map((s) => [s.student.name, s.metrics.avgCorrectness]) || []) },
  ];

  // Trajectory chart data
  const trajectoryData = data?.students.flatMap((s) =>
    s.trajectory.map((t) => ({
      attempt: t.attempt,
      score: t.score,
      student: s.student.name,
      date: t.date,
    }))
  ) || [];

  const colors = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/analytics">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Назад</Button>
          </Link>
          <h1 className="text-xl font-bold">Сравнение студентов</h1>
          <PrintButton label="Печать" />
        </div>

        {/* Input */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Введите ID студентов через запятую (2-5)"
                value={studentIds}
                onChange={(e) => setStudentIds(e.target.value)}
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <Button onClick={fetchData} disabled={loading}>
                Сравнить
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Найдите ID в разделе &quot;Успеваемость&quot; или &quot;Студенты группы риска&quot;</p>
          </CardContent>
        </Card>

        {loading && <div className="text-center py-8">Загрузка...</div>}

        {error && !loading && (
          <Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка: {error}</p></CardContent></Card>
        )}

        {!loading && !data && !error && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Введите ID студентов для сравнения</CardContent></Card>
        )}

        {!loading && data && data.students.length > 0 && (
          <>
            {/* Metrics Comparison Table */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Сравнение метрик</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2">Метрика</th>
                      {data.students.map((s) => <th key={s.student.id} className="text-right p-2">{s.student.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Ср. балл", fn: (s: StudentData) => <Badge variant={s.metrics.avgScore >= 75 ? "default" : s.metrics.avgScore >= 50 ? "secondary" : "destructive"}>{s.metrics.avgScore}%</Badge> },
                      { label: "Лучший балл", fn: (s: StudentData) => <Badge variant="default">{s.metrics.bestScore}%</Badge> },
                      { label: "Ср. EC", fn: (s: StudentData) => <span>{s.metrics.avgEc}%</span> },
                      { label: "Ср. BV", fn: (s: StudentData) => <span>{s.metrics.avgBv}%</span> },
                      { label: "Корректность", fn: (s: StudentData) => <span>{s.metrics.avgCorrectness}%</span> },
                      { label: "Ср. время", fn: (s: StudentData) => <span>{formatTime(s.metrics.avgTime)}</span> },
                      { label: "Попытки", fn: (s: StudentData) => <span>{s.metrics.totalAttempts}</span> },
                      { label: "Тренд", fn: (s: StudentData) => <TrendIndicator trend={s.metrics.trend} compact /> },
                    ].map((row) => (
                      <tr key={row.label} className="border-b">
                        <td className="p-2 font-medium">{row.label}</td>
                        {data.students.map((s) => <td key={s.student.id} className="p-2 text-right">{row.fn(s)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Radar Chart */}
            {data.students.length >= 2 && data.students.length <= 5 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Радар сравнения</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={fullRadarData}>
                      <PolarGrid className="stroke-muted" />
                      <PolarAngleAxis dataKey="metric" className="text-xs" />
                      <PolarRadiusAxis className="text-xs" domain={[0, 100]} />
                      {data.students.map((s, i) => (
                        <Radar key={s.student.id} name={s.student.name} dataKey={s.student.name} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.2} />
                      ))}
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Trajectory Chart */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Траектории баллов</CardTitle></CardHeader>
              <CardContent>
                {trajectoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trajectoryData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="attempt" className="text-xs" />
                      <YAxis className="text-xs" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      {data.students.map((s, i) => {
                        const studentTrajectory = s.trajectory.map((t) => ({
                          attempt: t.attempt,
                          score: t.score,
                        }));
                        return (
                          <Line
                            key={s.student.id}
                            type="monotone"
                            data={studentTrajectory}
                            dataKey="score"
                            name={s.student.name}
                            stroke={colors[i % colors.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        );
                      })}
                    </LineChart>
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
