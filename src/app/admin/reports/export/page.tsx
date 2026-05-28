"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Download, FileJson, BarChart3, Target,
  GraduationCap, AlertTriangle, Users, FileText, Activity,
  Loader2, Clock, Calendar, FolderKanban,
} from "lucide-react";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
}

interface ExportLog {
  id: string;
  action: string;
  entity: string | null;
  details: string;
  createdAt: string;
  user: { name: string | null; email: string; role: string };
}

const reportLabels: Record<string, string> = {
  comprehensive: "Комплексная аналитика",
  "teacher-performance": "Преподаватели",
  "task-insights": "Анализ задач",
  predictions: "Прогнозы и риски",
  "group-detailed": "Детализация группы",
  "student-list": "Список студентов",
  "attempt-log": "Журнал попыток",
  "item-difficulty": "Анализ сложности заданий",
  "time-score-correlation": "Корреляция времени и баллов",
  "completion-funnel": "Воронка прохождения",
  "error-patterns": "Анализ типичных ошибок",
  "activity-time": "Активность по времени",
  "completion-forecast": "Прогноз завершения",
  "teacher-effectiveness": "Эффективность преподавателей",
  "cohort-analysis": "Анализ когорт",
  "student-return": "Анализ возврата студентов",
  "group-task-matrix": "Матрица групп × задач",
};

const reportTypes = [
  {
    id: "comprehensive",
    title: "Комплексная аналитика",
    description: "Сводка платформы, все студенты с метриками, KPI",
    icon: Target,
    color: "text-blue-600",
  },
  {
    id: "teacher-performance",
    title: "Преподаватели",
    description: "Эффективность преподавателей, группы, активность студентов",
    icon: GraduationCap,
    color: "text-amber-600",
  },
  {
    id: "task-insights",
    title: "Анализ задач",
    description: "Сложность задач, процент отказов, покрытие EC/BV, время",
    icon: BarChart3,
    color: "text-emerald-600",
  },
  {
    id: "predictions",
    title: "Прогнозы и риски",
    description: "Студенты с рисками, факторы риска, уровень dropout",
    icon: AlertTriangle,
    color: "text-rose-600",
  },
  {
    id: "group-detailed",
    title: "Детализация группы",
    description: "Участники группы, статистика, матрица выполнения",
    icon: Users,
    color: "text-purple-600",
    requiresGroup: true,
  },
  {
    id: "student-list",
    title: "Список студентов",
    description: "Все студенты с баллами, уровнем риска и трендом",
    icon: FileText,
    color: "text-indigo-600",
  },
  {
    id: "attempt-log",
    title: "Журнал попыток",
    description: "Полный лог всех попыток с фильтрацией по дате",
    icon: Activity,
    color: "text-cyan-600",
  },
  {
    id: "item-difficulty",
    title: "Анализ сложности заданий",
    description: "IRT-анализ: сложность, дифференциация, угадываемость заданий",
    icon: Target,
    color: "text-violet-600",
  },
  {
    id: "time-score-correlation",
    title: "Корреляция времени и баллов",
    description: "Связь времени выполнения с качеством, поведенческие сегменты",
    icon: Clock,
    color: "text-sky-600",
  },
  {
    id: "completion-funnel",
    title: "Воронка прохождения",
    description: "Где студенты сходят, bottleneck-задания, completion rate",
    icon: BarChart3,
    color: "text-orange-600",
  },
  {
    id: "error-patterns",
    title: "Анализ типичных ошибок",
    description: "Проблемные EC/BV, студенты с худшим покрытием, тренды ошибок",
    icon: AlertTriangle,
    color: "text-red-600",
  },
  {
    id: "activity-time",
    title: "Активность по времени",
    description: "Heatmap день×час, пики активности, периоды суток",
    icon: Clock,
    color: "text-sky-600",
  },
  {
    id: "completion-forecast",
    title: "Прогноз завершения",
    description: "Кто завершит курс, скорость, недели до завершения, риск",
    icon: Calendar,
    color: "text-teal-600",
  },
  {
    id: "teacher-effectiveness",
    title: "Эффективность преподавателей",
    description: "Композитный score, рейтинг, влияние на прогресс студентов",
    icon: GraduationCap,
    color: "text-amber-600",
  },
  {
    id: "cohort-analysis",
    title: "Анализ когорт",
    description: "Кривые удержения, сравнение когорт по месяцам",
    icon: Users,
    color: "text-indigo-600",
  },
  {
    id: "student-return",
    title: "Анализ возврата",
    description: "Студенты после перерыва: прогресс до/после, догоняют ли",
    icon: Calendar,
    color: "text-cyan-600",
  },
  {
    id: "group-task-matrix",
    title: "Матрица групп × задач",
    description: "Сравнение групп по заданиям, отклонение от платформы",
    icon: FolderKanban,
    color: "text-teal-600",
  },
];

export default function AdminExportPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportHistory, setExportHistory] = useState<ExportLog[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const historyLimit = 10;

  useEffect(() => {
    fetch("/api/admin/groups")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setGroups(data);
      })
      .catch(() => {
        // Non-critical: groups filter is optional
      });
  }, []);

  const fetchHistory = (page = 1) => {
    fetch(`/api/admin/activity-log?action=EXPORT_REPORT&page=${page}&limit=${historyLimit}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setExportHistory(data.logs || []);
        setHistoryTotal(data.pagination?.total || 0);
        setHistoryPage(data.pagination?.page || 1);
      })
      .catch(() => {
        // Non-critical: export history is optional
      });
  };

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const handleExport = async (reportType: string, format: "csv" | "json" = "csv") => {
    if (reportType === "group-detailed" && !selectedGroup) {
      toast.error("Выберите группу для экспорта");
      return;
    }

    setExporting(reportType);
    try {
      const res = await fetch("/api/admin/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          startDate: dateFrom || undefined,
          endDate: dateTo || undefined,
          groupId: selectedGroup || undefined,
          format,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Ошибка экспорта");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filename = disposition
        ?.split("filename=")[1]
        ?.replace(/"/g, "") || `report.${format === "json" ? "json" : "csv"}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      fetchHistory(1);
    } catch (_e) {
      toast.error("Ошибка при экспорте");
    } finally {
      setExporting(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Центр экспорта отчётов</h2>
          <p className="text-sm text-muted-foreground">
            Экспорт аналитических отчётов в CSV формате
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Фильтры</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Дата с</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Дата по</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Группа</label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все группы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все группы</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDateFrom(""); setDateTo(""); setSelectedGroup(""); }}
                >
                  Сбросить
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((rt) => (
            <Card key={rt.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <rt.icon className={`h-5 w-5 ${rt.color}`} />
                  <CardTitle className="text-base">{rt.title}</CardTitle>
                  {rt.requiresGroup && (
                    <Badge variant="secondary" className="text-xs">Нужна группа</Badge>
                  )}
                </div>
                <CardDescription className="text-xs">{rt.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={exporting !== null}
                    onClick={() => handleExport(rt.id, "csv")}
                  >
                    {exporting === rt.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={exporting !== null}
                    onClick={() => handleExport(rt.id, "json")}
                  >
                    {exporting === rt.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <FileJson className="h-4 w-4 mr-1" />
                    )}
                    JSON
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Export History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              История экспорта
            </CardTitle>
            <CardDescription>Последние выгрузки отчётов</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {exportHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Нет выгрузок</p>
            ) : (
              <>
                <div className="divide-y">
                  {exportHistory.map((log) => {
                    const details = (() => { try { return JSON.parse(log.details); } catch { return {}; } })();
                    const reportName = reportLabels[details.reportType] || details.reportType || log.entity;
                    const format = (details.format || "csv").toUpperCase();
                    const dateRange = details.startDate && details.endDate
                      ? `${new Date(details.startDate).toLocaleDateString("ru-RU")} – ${new Date(details.endDate).toLocaleDateString("ru-RU")}`
                      : details.startDate ? `от ${new Date(details.startDate).toLocaleDateString("ru-RU")}` : "";
                    return (
                      <div key={log.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                        <Badge variant="outline" className="shrink-0">{format}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{reportName}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.user.name || log.user.email} {dateRange && `• ${dateRange}`}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(log.createdAt).toLocaleString("ru-RU")}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {historyTotal > historyLimit && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      {historyTotal} записей
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage <= 1}
                        onClick={() => { fetchHistory(historyPage - 1); }}
                      >
                        Назад
                      </Button>
                      <span className="text-xs">Стр. {historyPage}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage * historyLimit >= historyTotal}
                        onClick={() => { fetchHistory(historyPage + 1); }}
                      >
                        Вперёд
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
