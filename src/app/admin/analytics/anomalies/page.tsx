"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, AlertCircle, Info, RefreshCw } from "lucide-react";
import { PrintButton } from "@/components/admin/analytics/print-button";
import { AnalyticsFilterBar, type FilterState } from "@/components/admin/analytics/analytics-filter-bar";

interface AnomalyEntry {
  studentId: string;
  studentName: string;
  group: string;
  anomalyType: string;
  details: string;
  severity: "high" | "medium" | "low";
  timestamp: string;
}

interface AnomalyData {
  anomalies: AnomalyEntry[];
  summary: { total: number; byType: Record<string, number> };
}

const anomalyIcons: Record<string, React.ReactNode> = {
  sudden_drop: <AlertTriangle className="h-4 w-4 text-rose-600" />,
  score_spike: <AlertCircle className="h-4 w-4 text-amber-600" />,
  returned_student: <Info className="h-4 w-4 text-blue-600" />,
  time_anomaly: <AlertCircle className="h-4 w-4 text-amber-600" />,
  first_attempt_perfection: <Info className="h-4 w-4 text-blue-600" />,
};

const anomalyLabels: Record<string, string> = {
  sudden_drop: "Резкое снижение",
  score_spike: "Резкий рост",
  returned_student: "Возврат студента",
  time_anomaly: "Аномалия времени",
  first_attempt_perfection: "Идеал с первой попытки",
};

function SeverityBadge({ severity }: { severity: string }) {
  const colors = { high: "bg-rose-100 text-rose-700", medium: "bg-amber-100 text-amber-700", low: "bg-blue-100 text-blue-700" };
  const labels = { high: "Высокая", medium: "Средняя", low: "Низкая" };
  return <Badge className={colors[severity as keyof typeof colors]}>{labels[severity as keyof typeof labels]}</Badge>;
}

export default function AnomaliesPage() {
  const [data, setData] = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const fetchData = async (params: Partial<FilterState> = {}) => {
    setLoading(true);
    const entries = Object.entries(params).filter(([, v]) => v) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    try {
      const r = await fetch(`/api/admin/analytics/anomalies${qs ? `?${qs}` : ""}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredAnomalies = data?.anomalies.filter((a) =>
    filterSeverity === "all" || a.severity === filterSeverity
  ) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/analytics">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Назад</Button>
          </Link>
          <h2 className="text-xl font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> Аномалии</h2>
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Обновить
          </Button>
          <PrintButton label="Печать" />
        </div>

        <AnalyticsFilterBar onFilterChange={(filters) => fetchData(filters)} />

        {loading && <div className="text-center py-8">Загрузка...</div>}

        {!loading && !data && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Нет данных</CardContent></Card>
        )}

        {!loading && data && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Всего аномалий</div><div className="text-2xl font-bold">{data.summary.total}</div></CardContent></Card>
              {Object.entries(data.summary.byType).map(([type, count]) => (
                <Card key={type}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      {anomalyIcons[type] || <Info className="h-4 w-4" />}
                      <div>
                        <div className="text-xs text-muted-foreground">{anomalyLabels[type] || type}</div>
                        <div className="text-lg font-bold">{count}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filter by severity */}
            <div className="flex gap-2">
              {["all", "high", "medium", "low"].map((level) => (
                <Button
                  key={level}
                  variant={filterSeverity === level ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterSeverity(level)}
                >
                  {level === "all" ? "Все" : level === "high" ? "Высокая" : level === "medium" ? "Средняя" : "Низкая"}
                </Button>
              ))}
            </div>

            {/* Anomaly Cards */}
            <div className="space-y-3">
              {filteredAnomalies.map((a, i) => (
                <Card key={i} className="border-l-4" style={{
                  borderLeftColor: a.severity === "high" ? "#ef4444" : a.severity === "medium" ? "#f59e0b" : "#3b82f6"
                }}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {anomalyIcons[a.anomalyType] || <Info className="h-4 w-4" />}
                        <div>
                          <div className="font-medium">{a.studentName || a.studentId}</div>
                          <div className="text-sm text-muted-foreground">
                            {a.group}{a.group ? " • " : ""}{anomalyLabels[a.anomalyType] || a.anomalyType}
                          </div>
                          <div className="text-sm mt-1">{a.details}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(a.timestamp).toLocaleDateString("ru-RU")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={a.severity} />
                        <Link href={`/admin/analytics/student/${a.studentId}`}>
                          <Button variant="ghost" size="sm">Подробнее</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredAnomalies.length === 0 && (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Нет аномалий с выбранным фильтром</CardContent></Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
