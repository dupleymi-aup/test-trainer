"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertCircle, Route, ArrowRight } from "lucide-react";
import { useFetchData } from "@/hooks/use-fetch-data";

interface PathData {
  commonPaths: { path: string[]; count: number; avgScore: number }[];
  dropoffPoints: { taskId: string; taskName: string; dropoffCount: number; dropoffRate: number; avgScoreAtDropoff: number }[];
  taskOrderMatrix: Record<string, Record<string, number>>;
  totalStudents: number;
}

export default function LearningPathPage() {
  const { data, loading, error } = useFetchData<PathData>("/api/admin/analytics/learning-path");

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center text-rose-600">Нет данных</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Путь обучения</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Студентов с ≥3 попытками</div><div className="text-2xl font-bold">{data.totalStudents}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Уникальных путей</div><div className="text-2xl font-bold">{data.commonPaths.length}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Точек схода</div><div className="text-2xl font-bold">{data.dropoffPoints.length}</div></CardContent></Card>
        </div>

        {/* Common paths */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Route className="h-4 w-4" /> Наиболее частые пути</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.commonPaths.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded">
                <span className="text-sm font-bold w-8 text-center text-muted-foreground">{i + 1}</span>
                <div className="flex-1 flex flex-wrap items-center gap-1">
                  {p.path.map((taskId, j) => (
                    <span key={j} className="inline-flex items-center gap-1">
                      {j > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                      <Badge variant="outline" className="text-xs">{taskId}</Badge>
                    </span>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground w-16 text-right">{p.count} студ.</span>
                <Badge variant={p.avgScore >= 75 ? "default" : p.avgScore >= 50 ? "secondary" : "destructive"} className="w-14 text-center">{p.avgScore}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Drop-off points */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 text-rose-600" /> Точки схода студентов</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Задача</TableHead><TableHead className="text-right">Сход</TableHead><TableHead className="text-right">% от всех</TableHead><TableHead className="text-right">Ср. балл при сходе</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.dropoffPoints.map((d) => (
                  <TableRow key={d.taskId}>
                    <TableCell className="font-medium">{d.taskName}</TableCell>
                    <TableCell className="text-right">{d.dropoffCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Progress value={d.dropoffRate} className="h-2 w-20" />
                        <span className="text-sm w-10 text-right">{d.dropoffRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right"><Badge variant={d.avgScoreAtDropoff >= 75 ? "default" : d.avgScoreAtDropoff >= 50 ? "secondary" : "destructive"}>{d.avgScoreAtDropoff}%</Badge></TableCell>
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
