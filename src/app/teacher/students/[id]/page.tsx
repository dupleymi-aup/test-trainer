"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface ProgressData {
  student: { id: string; name: string | null; email: string | null; group: string | null; university: string | null };
  stats: { bestScore: number; avgScore: number; avgEc: number; avgBv: number; totalAttempts: number };
  attempts: Array<{ id: string; taskId: string; score: number; ecCoverage: number; bvCoverage: number; correctness: number; timeSpent: number; createdAt: string }>;
  scoresOverTime: Array<{ date: string; score: number; ecCoverage: number; bvCoverage: number }>;
}

export default function TeacherStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/teacher/students/${id}/progress`)
        .then((r) => r.json())
        .then((d) => { setData(d); setLoading(false); })
        .catch(() => setLoading(false));
    });
  }, [params]);

  if (loading) return <TeacherLayout><div className="p-8 text-center">Загрузка...</div></TeacherLayout>;
  if (!data) return <TeacherLayout><div className="p-8 text-center">Не найдено</div></TeacherLayout>;

  const chartData = data.scoresOverTime.map((entry, i) => ({
    attempt: `#${i + 1}`,
    score: entry.score,
    ec: entry.ecCoverage,
    bv: entry.bvCoverage,
  }));

  return (
    <TeacherLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/teacher/students"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h2 className="text-lg font-bold">{data.student.name || data.student.email}</h2>
            {data.student.group && <p className="text-sm text-muted-foreground">{data.student.group}{data.student.university ? ` • ${data.student.university}` : ""}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Лучший балл", value: data.stats.bestScore },
            { label: "Средний балл", value: data.stats.avgScore },
            { label: "Ср. EC", value: data.stats.avgEc },
            { label: "Ср. BV", value: data.stats.avgBv },
            { label: "Попытки", value: data.stats.totalAttempts },
          ].map((s) => (
            <Card key={s.label}><CardContent className="pt-4 text-center"><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
          ))}
        </div>

        {/* Score Trends Chart */}
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
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="attempt" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} name="Балл" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="ec" stroke="hsl(var(--chart-1, 12 76% 61%))" strokeWidth={1.5} name="EC" strokeDasharray="5 3" />
                  <Line type="monotone" dataKey="bv" stroke="hsl(var(--chart-2, 173 58% 39%))" strokeWidth={1.5} name="BV" strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-sm">История попыток</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Задание</TableHead>
                  <TableHead>Балл</TableHead>
                  <TableHead>EC</TableHead>
                  <TableHead>BV</TableHead>
                  <TableHead>Корректность</TableHead>
                  <TableHead>Время (с)</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.attempts.map((a, i) => (
                  <TableRow key={a.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{a.taskId}</TableCell>
                    <TableCell><Badge variant={a.score >= 75 ? "default" : "secondary"}>{a.score}%</Badge></TableCell>
                    <TableCell><Progress value={a.ecCoverage} className="h-1.5 w-16" /></TableCell>
                    <TableCell><Progress value={a.bvCoverage} className="h-1.5 w-16" /></TableCell>
                    <TableCell>{a.correctness}%</TableCell>
                    <TableCell>{a.timeSpent}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString("ru-RU")}</TableCell>
                  </TableRow>
                ))}
                {data.attempts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Пока нет попыток
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}
