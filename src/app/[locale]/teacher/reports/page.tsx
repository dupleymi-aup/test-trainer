"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Users, AlertTriangle, Grid3X3, FileJson } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export default function TeacherReportsPage() {
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [groupId, setGroupId] = useState<string | undefined>();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exportType, setExportType] = useState<"summary" | "detailed" | "at-risk">("summary");
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/teacher/groups", { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (!controller.signal.aborted) { setGroups(d.groups || []); setLoadingGroups(false); } })
      .catch((err) => { if (!controller.signal.aborted) { logger.error("Failed to load groups", err); toast.error("Failed to load group list"); setLoadingGroups(false); } });
    return () => controller.abort();
  }, []);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: groupId || null,
          startDate: dateFrom || null,
          endDate: dateTo || null,
          exportType,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `student-report-${exportType}-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Report exported");
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Export error");
      }
    } catch {
      toast.error("Export error");
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/reports/export-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: groupId || null,
          startDate: dateFrom || null,
          endDate: dateTo || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `student-report-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("JSON отчёт экспортирован");
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Ошибка при экспорте JSON отчёта");
      }
    } catch {
      toast.error("Export error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Report type cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/teacher/reports/group-performance">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">Прогресс по группам</h3>
                    <p className="text-xs text-muted-foreground">
                      Сравнение групп, тренды студентов, активные/неактивные
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/teacher/reports/at-risk">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-8 w-8 text-rose-600 shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">Студенты риска</h3>
                    <p className="text-xs text-muted-foreground">
                      Студенты с низким баллом, снижением тренда, неактивные
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/teacher/reports/completion-matrix">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Grid3X3 className="h-8 w-8 text-purple-600 shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">Матрица заданий</h3>
                    <p className="text-xs text-muted-foreground">
                      Выполнение заданий по группе, лучшие баллы, попытки
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">Экспорт отчётов</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Group</label>
              <Select onValueChange={(v) => setGroupId(v === "ALL" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingGroups ? "Загрузка..." : "Все группы"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All groups</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Дата от</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Дата до</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Тип экспорта</label>
              <Select onValueChange={(v) => setExportType(v as "summary" | "detailed" | "at-risk")} value={exportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Сводка</SelectItem>
                  <SelectItem value="detailed">Детальный</SelectItem>
                  <SelectItem value="at-risk">Студенты риска</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={handleExportJSON} disabled={loading} variant="outline">
              <FileJson className="h-4 w-4 mr-1" /> Экспорт JSON
            </Button>
            <Button onClick={handleExport} disabled={loading}>
              <Download className="h-4 w-4 mr-1" /> Экспорт CSV
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </TeacherLayout>
  );
}
