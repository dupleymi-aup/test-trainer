"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertCircle } from "lucide-react";

interface EcGap {
  taskId: string; taskName: string; ecId: string; ecName: string; missRate: number;
}
interface BvGap {
  taskId: string; taskName: string; bvDesc: string; missRate: number;
}
interface TaskGap {
  taskId: string; taskName: string; weakestECs: EcGap[]; weakestBVs: BvGap[];
}

interface GapData {
  taskGaps: TaskGap[];
  worstECs: EcGap[];
  worstBVs: BvGap[];
}

export default function EcbvGapsPage() {
  const [data, setData] = useState<GapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics/ec-bv-gaps")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }).then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center text-rose-600">Нет данных</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Анализ покрытия EC/BV</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Worst ECs */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 text-rose-600" /> Наиболее пропускаемые EC</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Задача</TableHead><TableHead>Класс эквивалентности</TableHead><TableHead className="text-right">Miss Rate</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.worstECs.slice(0, 10).map((ec, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{ec.taskName}</TableCell>
                      <TableCell className="text-sm">{ec.ecName} ({ec.ecId})</TableCell>
                      <TableCell className="text-right"><Badge variant={ec.missRate > 50 ? "destructive" : ec.missRate > 30 ? "secondary" : "default"}>{ec.missRate}%</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Worst BVs */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-600" /> Наиболее пропускаемые BV</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Задача</TableHead><TableHead>Граничное значение</TableHead><TableHead className="text-right">Miss Rate</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.worstBVs.slice(0, 10).map((bv, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{bv.taskName}</TableCell>
                      <TableCell className="text-sm font-mono">{bv.bvDesc}</TableCell>
                      <TableCell className="text-right"><Badge variant={bv.missRate > 50 ? "destructive" : bv.missRate > 30 ? "secondary" : "default"}>{bv.missRate}%</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Per-task gaps */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Проблемные EC/BV по задачам</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {data.taskGaps.map((tg) => (
              <div key={tg.taskId} className="border rounded p-4">
                <h4 className="font-medium mb-3">{tg.taskName}</h4>
                {tg.weakestECs.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Классы эквивалентности</p>
                    {tg.weakestECs.map((ec, i) => (
                      <div key={i} className="flex items-center gap-2 mb-1">
                        <span className="text-sm flex-1">{ec.ecName}</span>
                        <Progress value={100 - ec.missRate} className="h-2 w-32" />
                        <span className="text-sm w-12 text-right">{ec.missRate}%</span>
                      </div>
                    ))}
                  </div>
                )}
                {tg.weakestBVs.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Граничные значения</p>
                    {tg.weakestBVs.map((bv, i) => (
                      <div key={i} className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono flex-1">{bv.bvDesc}</span>
                        <Progress value={100 - bv.missRate} className="h-2 w-32" />
                        <span className="text-sm w-12 text-right">{bv.missRate}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
