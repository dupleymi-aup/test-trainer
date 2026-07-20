"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useFetchData } from "@/hooks/use-fetch-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, Download, CalendarCheck, Clock, AlertTriangle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface DeadlineCompliance {
  deadlineId: string;
  title: string;
  dueDate: string;
  type: string;
  totalStudents: number;
  complied: number;
  missed: number;
  notApplicable: number;
  complianceRate: number;
}

export default function AdminDeadlineCompliancePage() {
  const { data: resp, loading } = useFetchData<{ deadlines?: DeadlineCompliance[]; report?: DeadlineCompliance[] }>("/api/admin/reports/deadline-compliance");
  const report = resp?.deadlines || resp?.report || [];

  const exportCSV = () => {
    const headers = ["Дедлайн", "Тип", "Дата", "Студентов", "Соблюли", "Нарушили", "Показатель"];
    const rows = report.map((d) => [d.title, d.type, new Date(d.dueDate).toLocaleDateString("ru-RU"), d.totalStudents, d.complied, d.missed, `${d.complianceRate}%`].join(","));
    const csv = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `deadline-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <AdminLayout><div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  const avgRate = report.length > 0 ? Math.round(report.reduce((s, d) => s + d.complianceRate, 0) / report.length) : 0;
  const totalMissed = report.reduce((s, d) => s + d.missed, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Соблюдение дедлайнов</h2>
            <p className="text-sm text-muted-foreground mt-1">Статистика соблюдения дедлайнов по каждому сроку</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-3 w-3 mr-1" /> CSV</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CalendarCheck className="h-8 w-8 text-emerald-600" /><div><p className="text-2xl font-bold">{avgRate}%</p><p className="text-xs text-muted-foreground">Среднее соблюдение</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" /><div><p className="text-2xl font-bold">{report.length}</p><p className="text-xs text-muted-foreground">Дедлайнов</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-rose-600" /><div><p className="text-2xl font-bold">{totalMissed}</p><p className="text-xs text-muted-foreground">Нарушений</p></div></div></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дедлайн</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="text-right">Студентов</TableHead>
                  <TableHead className="text-right">Соблюли</TableHead>
                  <TableHead className="text-right">Нарушили</TableHead>
                  <TableHead>Соблюдение</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.map((d) => (
                  <TableRow key={d.deadlineId}>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell><Badge variant="outline">{d.type}</Badge></TableCell>
                    <TableCell>{new Date(d.dueDate).toLocaleDateString("ru-RU")}</TableCell>
                    <TableCell className="text-right">{d.totalStudents}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">{d.complied}</TableCell>
                    <TableCell className="text-right text-rose-600 font-medium">{d.missed}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={d.complianceRate} className="h-2 w-24" />
                        <span className="text-xs font-medium">{d.complianceRate}%</span>
                      </div>
                    </TableCell>
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
