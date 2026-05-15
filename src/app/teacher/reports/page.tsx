"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function TeacherReportsPage() {
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [groupId, setGroupId] = useState<string | undefined>();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    fetch("/api/teacher/groups")
      .then((r) => r.json())
      .then((d) => { setGroups(d.groups || []); setLoadingGroups(false); })
      .catch(() => setLoadingGroups(false));
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
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "student-report.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Отчёт экспортирован");
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Ошибка при экспорте отчёта");
      }
    } catch {
      toast.error("Ошибка экспорта");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TeacherLayout>
      <Card>
        <CardHeader><CardTitle className="text-sm">Экспорт отчётов</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Группа</label>
              <Select onValueChange={(v) => setGroupId(v === "ALL" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingGroups ? "Загрузка..." : "Все группы"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Все группы</SelectItem>
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
          </div>
          <div className="flex justify-end">
            <Button onClick={handleExport} disabled={loading}>
              <Download className="h-4 w-4 mr-1" /> Экспорт CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </TeacherLayout>
  );
}
