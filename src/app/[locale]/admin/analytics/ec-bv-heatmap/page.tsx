"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Target, Crosshair } from "lucide-react";

interface EcData {
  ecId: string;
  ecName: string;
  taskName: string;
  difficulty: string;
  covered: number;
  missed: number;
  total: number;
  missRate: number;
}

interface BvData {
  bvDesc: string;
  taskName: string;
  difficulty: string;
  covered: number;
  missed: number;
  total: number;
  missRate: number;
}

interface Summary {
  ecCoverageRate: number;
  bvCoverageRate: number;
  totalEcTests: number;
  totalBvTests: number;
  mostMissedEc: EcData | null;
  mostMissedBv: BvData | null;
}

function MissRateBar({ value }: { value: number }) {
  const color = value >= 60 ? "bg-red-500" : value >= 40 ? "bg-orange-500" : value >= 20 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <Progress value={value} className={`h-2 flex-1 [&>div]:${color}`} />
      <span className="text-xs font-bold w-10 text-right">{value}%</span>
    </div>
  );
}

export default function AdminEcBvHeatmapPage() {
  const [ecHeatmap, setEcHeatmap] = useState<EcData[]>([]);
  const [bvHeatmap, setBvHeatmap] = useState<BvData[]>([]);
  const [byTaskEc, setByTaskEc] = useState<Record<string, EcData[]>>({});
  const [byTaskBv, setByTaskBv] = useState<Record<string, BvData[]>>({});
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/analytics/ec-bv-heatmap", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setEcHeatmap(data.ecHeatmap || []);
        setBvHeatmap(data.bvHeatmap || []);
        setByTaskEc(data.byTaskEc || {});
        setByTaskBv(data.byTaskBv || {});
        setSummary(data.summary);
        setLoading(false);
      })
      .catch((e) => { if (controller.signal.aborted) return; setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
    return () => controller.abort();
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;

  if (error) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Тепловая карта покрытия EC/BV</h1>
          <p className="text-sm text-muted-foreground">
            Какие классы эквивалентности и граничные значения чаще всего пропускают студенты
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-muted-foreground">Покрытие EC</span>
              </div>
              <p className="text-2xl font-bold">{summary?.ecCoverageRate}%</p>
              <p className="text-xs text-muted-foreground">{summary?.totalEcTests} тестов</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Crosshair className="h-4 w-4 text-purple-600" />
                <span className="text-xs text-muted-foreground">Покрытие BV</span>
              </div>
              <p className="text-2xl font-bold">{summary?.bvCoverageRate}%</p>
              <p className="text-xs text-muted-foreground">{summary?.totalBvTests} тестов</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-xs text-muted-foreground">Худший EC</span>
              </div>
              <p className="text-sm font-bold truncate">{summary?.mostMissedEc?.ecName || "—"}</p>
              <p className="text-xs text-muted-foreground">{summary?.mostMissedEc?.missRate}% пропусков</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-xs text-muted-foreground">Худший BV</span>
              </div>
              <p className="text-sm font-bold truncate">{summary?.mostMissedBv?.bvDesc || "—"}</p>
              <p className="text-xs text-muted-foreground">{summary?.mostMissedBv?.missRate}% пропусков</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="ec">
          <TabsList>
            <TabsTrigger value="ec">Классы эквивалентности</TabsTrigger>
            <TabsTrigger value="bv">Граничные значения</TabsTrigger>
            <TabsTrigger value="byTask">По заданиям</TabsTrigger>
          </TabsList>

          <TabsContent value="ec" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Пропускаемые классы эквивалентности</CardTitle>
                <CardDescription>Отсортировано по проценту пропусков (худшие сверху)</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>EC</TableHead>
                      <TableHead>Задание</TableHead>
                      <TableHead>Сложность</TableHead>
                      <TableHead className="text-right">Покрыто</TableHead>
                      <TableHead className="text-right">Пропущено</TableHead>
                      <TableHead className="min-w-[200px]">Процент пропусков</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ecHeatmap.map((ec) => (
                      <TableRow key={ec.ecId}>
                        <TableCell className="font-medium text-xs max-w-[200px] truncate" title={ec.ecName}>
                          {ec.ecName}
                        </TableCell>
                        <TableCell className="text-sm">{ec.taskName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            ec.difficulty === "Легко" ? "text-green-600" :
                            ec.difficulty === "Средне" ? "text-amber-600 dark:text-amber-400" : "text-red-600"
                          }>{ec.difficulty}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-bold">{ec.covered}</TableCell>
                        <TableCell className="text-right text-red-600 font-bold">{ec.missed}</TableCell>
                        <TableCell>
                          <MissRateBar value={ec.missRate} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bv" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Пропускаемые граничные значения</CardTitle>
                <CardDescription>Отсортировано по проценту пропусков (худшие сверху)</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Граничное значение</TableHead>
                      <TableHead>Задание</TableHead>
                      <TableHead>Сложность</TableHead>
                      <TableHead className="text-right">Покрыто</TableHead>
                      <TableHead className="text-right">Пропущено</TableHead>
                      <TableHead className="min-w-[200px]">Процент пропусков</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bvHeatmap.map((bv, i) => (
                      <TableRow key={`bv_${i}`}>
                        <TableCell className="font-medium text-xs max-w-[200px] truncate" title={bv.bvDesc}>
                          {bv.bvDesc}
                        </TableCell>
                        <TableCell className="text-sm">{bv.taskName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            bv.difficulty === "Легко" ? "text-green-600" :
                            bv.difficulty === "Средне" ? "text-amber-600 dark:text-amber-400" : "text-red-600"
                          }>{bv.difficulty}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-bold">{bv.covered}</TableCell>
                        <TableCell className="text-right text-red-600 font-bold">{bv.missed}</TableCell>
                        <TableCell>
                          <MissRateBar value={bv.missRate} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="byTask" className="space-y-6">
            {Object.entries(byTaskEc).map(([taskName, ecs]) => (
              <Card key={taskName}>
                <CardHeader>
                  <CardTitle className="text-sm">{taskName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Классы эквивалентности</p>
                    <div className="space-y-2">
                      {ecs.map((ec) => (
                        <div key={ec.ecId} className="flex items-center gap-3">
                          <span className="text-xs w-48 truncate" title={ec.ecName}>{ec.ecName}</span>
                          <div className="flex-1"><MissRateBar value={ec.missRate} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {byTaskBv[taskName] && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Граничные значения</p>
                      <div className="space-y-2">
                        {byTaskBv[taskName].map((bv, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs w-48 truncate" title={bv.bvDesc}>{bv.bvDesc}</span>
                            <div className="flex-1"><MissRateBar value={bv.missRate} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
