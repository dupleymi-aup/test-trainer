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
  Download, FileSpreadsheet, FileJson, BarChart3, Target,
  GraduationCap, AlertTriangle, Users, FileText, Activity,
  Loader2,
} from "lucide-react";

interface Group {
  id: string;
  name: string;
}

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
];

export default function AdminExportPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teacher/groups")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setGroups(data);
      })
      .catch((err) => {
        console.warn("Failed to fetch groups:", err);
      });
  }, []);

  const handleExport = async (reportType: string) => {
    if (reportType === "group-detailed" && !selectedGroup) {
      alert("Выберите группу для экспорта");
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
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Ошибка экспорта");
        return;
      }

      const blob = await res.blob();
      const filename = res.headers.get("Content-Disposition")
        ?.split("filename=")[1]
        ?.replace(/"/g, "") || "report.csv";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Ошибка при экспорте");
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
                    onClick={() => handleExport(rt.id)}
                  >
                    {exporting === rt.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    Экспорт CSV
                  </Button>
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
