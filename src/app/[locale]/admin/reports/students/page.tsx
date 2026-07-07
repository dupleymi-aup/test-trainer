"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Users, BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface StudentReport {
  userId: string;
  name: string;
  email: string;
  university: string;
  totalAttempts: number;
  avgScore: number;
  avgEc: number;
  avgBv: number;
  bestScore: number;
  tasksAttempted: number;
  tasksCompleted: number;
  lastActivity: string | null;
  trend: "improving" | "stable" | "declining";
}

export default function AdminStudentsReportPage() {
  const [report, setReport] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/reports/students", { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => { if (!controller.signal.aborted) { setReport(data.students || data.report || []); setLoading(false); } })
      .catch(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const exportCSV = () => {
    const headers = ["Имя", "Email", "Университет", "Попыток", "Ср. балл", "Ср. EC", "Ср. BV", "Лучший", "Заданий", "Завершено", "Активность", "Тренд"];
    const rows = report.map((s) => [s.name, s.email, s.university, s.totalAttempts, `${s.avgScore}%`, `${s.avgEc}%`, `${s.avgBv}%`, `${s.bestScore}%`, s.tasksAttempted, s.tasksCompleted, s.lastActivity || "-", s.trend].join(","));
    const csv = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `student-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <AdminLayout><div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  const avgScore = report.length > 0 ? Math.round(report.reduce((s, r) => s + r.avgScore, 0) / report.length) : 0;

  const getTrendIcon = (t: string) => t === "improving" ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : t === "declining" ? <TrendingDown className="h-3 w-3 text-rose-600" /> : <Minus className="h-3 w-3" />;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Отчёт по студентам</h2>
            <p className="text-sm text-muted-foreground mt-1">Сводная статистика по всем студентам платформы</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-3 w-3 mr-1" /> CSV</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-8 w-8 text-blue-600 dark:text-blue-400" /><div><p className="text-2xl font-bold">{report.length}</p><p className="text-xs text-muted-foreground">Студентов</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><BarChart3 className="h-8 w-8 text-emerald-600" /><div><p className="text-2xl font-bold">{avgScore}%</p><p className="text-xs text-muted-foreground">Средний балл</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-amber-600 dark:text-amber-400" /><div><p className="text-2xl font-bold">{report.filter((s) => s.trend === "improving").length}</p><p className="text-xs text-muted-foreground">Растут</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingDown className="h-8 w-8 text-rose-600" /><div><p className="text-2xl font-bold">{report.filter((s) => s.trend === "declining").length}</p><p className="text-xs text-muted-foreground">Снижаются</p></div></div></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Студент</TableHead>
                  <TableHead className="text-right">Попыток</TableHead>
                  <TableHead className="text-right">Ср. балл</TableHead>
                  <TableHead className="text-right">Ср. EC</TableHead>
                  <TableHead className="text-right">Ср. BV</TableHead>
                  <TableHead className="text-right">Лучший</TableHead>
                  <TableHead>Тренд</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.map((s) => (
                  <TableRow key={s.userId}>
                    <TableCell className="font-medium">{s.name || s.email}</TableCell>
                    <TableCell className="text-right">{s.totalAttempts}</TableCell>
                    <TableCell className="text-right"><Badge variant={s.avgScore >= 75 ? "default" : s.avgScore >= 50 ? "secondary" : "destructive"}>{s.avgScore}%</Badge></TableCell>
                    <TableCell className="text-right">{s.avgEc}%</TableCell>
                    <TableCell className="text-right">{s.avgBv}%</TableCell>
                    <TableCell className="text-right">{s.bestScore}%</TableCell>
                    <TableCell>{getTrendIcon(s.trend)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
