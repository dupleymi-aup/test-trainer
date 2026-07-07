"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Template {
  id: string; name: string; description: string | null; taskIds: string;
  topics: string | null; estimatedHours: number | null;
  createdBy: { id: string; name: string | null }; createdAt: string;
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/teacher/templates", { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setTemplates(d.templates || []); setLoading(false); })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить шаблон?")) return;
    try {
      const res = await apiFetch(`/api/teacher/templates/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Удалён"); setTemplates((prev) => prev.filter((t) => t.id !== id)); }
      else toast.error("Ошибка");
    } catch { toast.error("Ошибка"); }
  };

  if (loading) return <AdminLayout><div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Шаблоны курсов</h2>
          <p className="text-muted-foreground text-sm">Все шаблоны, созданные преподавателями</p>
        </div>

        {templates.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground"><BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Нет созданных шаблонов</p></CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Автор</TableHead>
                    <TableHead>Заданий</TableHead>
                    <TableHead>Часов</TableHead>
                    <TableHead>Создан</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((tmpl) => {
                    const taskIds: number[] = (() => { try { return JSON.parse(tmpl.taskIds); } catch { return []; } })();
                    return (
                      <TableRow key={tmpl.id}>
                        <TableCell className="font-medium">{tmpl.name}</TableCell>
                        <TableCell>{tmpl.createdBy.name || tmpl.createdBy.id}</TableCell>
                        <TableCell><Badge variant="outline">{taskIds.length}</Badge></TableCell>
                        <TableCell>{tmpl.estimatedHours ? `${tmpl.estimatedHours}ч` : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(tmpl.createdAt).toLocaleDateString("ru-RU")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setExpandedId(expandedId === tmpl.id ? null : tmpl.id)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(tmpl.id)} className="text-rose-600">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
