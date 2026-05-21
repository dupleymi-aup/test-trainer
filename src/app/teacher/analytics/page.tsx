"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Analytics {
  distribution: Record<string, number>;
  taskDifficulty: Array<{ taskId: string; avgScore: number; attemptsCount: number }>;
  overallAvg: number;
  totalAttempts: number;
}

export default function TeacherAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teacher/analytics")
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <TeacherLayout><div className="p-8 text-center">Загрузка...</div></TeacherLayout>;
  if (!data) return <TeacherLayout><div className="p-8 text-center">Ошибка</div></TeacherLayout>;

  return (
    <TeacherLayout>
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Распределение баллов</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end h-32">
              {Object.entries(data.distribution).map(([range, count]) => {
                const max = Object.values(data.distribution).reduce((m, v) => Math.max(m, v), 1);
                const height = (count / max) * 100;
                return (
                  <div key={range} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-bold">{count}</span>
                    <div className="w-full bg-muted rounded-t" style={{ height: `${height}%`, minHeight: "4px" }}>
                      <div className="w-full h-full bg-emerald-500 rounded-t" style={{ height: "100%" }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{range}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Сложность заданий</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.taskDifficulty.map((t) => (
                <div key={t.taskId} className="flex items-center gap-4 p-3">
                  <span className="font-mono text-xs w-16">{t.taskId}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${t.avgScore >= 75 ? "bg-emerald-500" : t.avgScore >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                          style={{ width: `${t.avgScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold w-12 text-right">{t.avgScore}%</span>
                    </div>
                  </div>
                  <Badge variant="outline">{t.attemptsCount} попыток</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}
