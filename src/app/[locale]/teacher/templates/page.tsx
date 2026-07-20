"use client";

import { useState } from "react";
import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, BookTemplate, Save, Trash2, Clock, BookOpen, Edit, Copy, Eye, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { tasks } from "@/lib/tasks";
import { safeJsonParse } from "@/lib/utils";
import Link from "next/link";
import { useSWRApi } from "@/hooks/use-swr-api";
import { mutate as swrMutate } from "swr";

interface Template {
  id: string;
  name: string;
  description: string | null;
  taskIds: string;
  topics: string | null;
  estimatedHours: number | null;
  createdAt: string;
  createdBy: { id: string; name: string | null };
  assignments: Array<{ group: { id: string; name: string } }>;
}

interface TemplatesData {
  templates: Template[];
}

type Difficulty = "Легко" | "Средне" | "Сложно";

const difficultyColors: Record<Difficulty, string> = {
  "Легко": "bg-emerald-100 text-emerald-700",
  "Средне": "bg-amber-100 text-amber-700",
  "Сложно": "bg-rose-100 text-rose-700",
};

export default function TemplatesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [estimatedHours, setEstimatedHours] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch templates via SWR (cached)
  const { data: templatesData, isLoading } = useSWRApi<TemplatesData>("/api/teacher/templates");
  const templates = templatesData?.templates || [];

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedTasks([]);
    setEstimatedHours("");
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const openEdit = (template: Template) => {
    setName(template.name);
    setDescription(template.description || "");
    setSelectedTasks(template.taskIds ? safeJsonParse<number[]>(template.taskIds, []) : []);
    setEstimatedHours(template.estimatedHours ? String(template.estimatedHours) : "");
    setEditingId(template.id);
    setShowCreate(true);
  };

  const saveTemplate = async () => {
    if (!name.trim() || selectedTasks.length === 0) {
      toast.error("Введите название и выберите хотя бы одно задание");
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/teacher/templates/${editingId}` : "/api/teacher/templates";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          taskIds: selectedTasks,
          estimatedHours: estimatedHours ? parseInt(estimatedHours, 10) : null,
        }),
      });
      if (res.ok) {
        toast.success(editingId ? "Шаблон обновлён" : "Шаблон создан");
        setShowCreate(false);
        resetForm();
        swrMutate("/api/teacher/templates");
      } else {
        const err = await res.json();
        toast.error(err.error || "Ошибка сохранения");
      }
    } catch {
      toast.error("Не удалось сохранить шаблон");
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Удалить шаблон?")) return;
    try {
      const res = await fetch(`/api/teacher/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Шаблон удалён");
        swrMutate("/api/teacher/templates");
      }
    } catch {
      toast.error("Не удалось удалить");
    }
  };

  const toggleTask = (taskId: number) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  // Pre-built templates
  const prebuiltTemplates = [
    {
      name: "Основы тестирования",
      description: "Базовые задания для начала: факториал, простые числа, скидки",
      taskIds: [1, 2, 3],
      topics: ["Классы эквивалентности", "Граничные значения"],
      estimatedHours: 4,
    },
    {
      name: "Углублённое тестирование",
      description: "Продвинутые темы: високосный год, треугольники, пароли, палиндромы",
      taskIds: [4, 5, 6, 7],
      topics: ["Классы эквивалентности", "Граничные значения", "Таблицы решений"],
      estimatedHours: 6,
    },
    {
      name: "Валидация данных",
      description: "Проверка email, телефонов, дат, римских чисел",
      taskIds: [8, 9, 10, 11],
      topics: ["Классы эквивалентности", "Граничные значения", "Валидация"],
      estimatedHours: 6,
    },
    {
      name: "Алгоритмы и вычисления",
      description: "BMI, парсинг чисел, flatten массива, Фибоначчи",
      taskIds: [12, 13, 14, 15],
      topics: ["Граничные значения", "Исключения", "Алгоритмы"],
      estimatedHours: 5,
    },
  ];

  const createPrebuilt = async (prebuilt: (typeof prebuiltTemplates)[number]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prebuilt.name,
          description: prebuilt.description,
          taskIds: prebuilt.taskIds,
          topics: prebuilt.topics,
          estimatedHours: prebuilt.estimatedHours,
        }),
      });
      if (res.ok) {
        toast.success(`Шаблон "${prebuilt.name}" создан`);
        swrMutate("/api/teacher/templates");
      }
    } catch {
      toast.error("Ошибка создания");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookTemplate className="h-6 w-6 text-purple-600" />
              Шаблоны курсов
            </h1>
            <p className="text-muted-foreground mt-1">
              Готовые наборы заданий для назначения группам
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Создать шаблон
          </Button>
        </div>

        {/* Pre-built templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Готовые шаблоны
            </CardTitle>
            <CardDescription>Используйте готовые программы или создайте свои</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prebuiltTemplates.map((pbt, i) => (
                <Card key={i} className="border-dashed">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">{pbt.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{pbt.description}</p>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary">{pbt.taskIds.length} заданий</Badge>
                      {pbt.estimatedHours && (
                        <Badge variant="outline">
                          <Clock className="mr-1 h-3 w-3" /> ~{pbt.estimatedHours}ч
                        </Badge>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => createPrebuilt(pbt)} disabled={saving}>
                      {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Copy className="mr-1 h-3 w-3" />}
                      Использовать
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* My templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Мои шаблоны</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : templates.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <BookTemplate className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>У вас пока нет шаблонов</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((tpl) => {
                  const parsedTasks = safeJsonParse<number[]>(tpl.taskIds, []);
                  return (
                    <Card key={tpl.id} className="hover:bg-muted/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{tpl.name}</h3>
                              {tpl.estimatedHours && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="mr-1 h-3 w-3" /> ~{tpl.estimatedHours}ч
                                </Badge>
                              )}
                            </div>
                            {tpl.description && (
                              <p className="text-sm text-muted-foreground mb-2">{tpl.description}</p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <Badge variant="secondary">{parsedTasks.length} заданий</Badge>
                              {tpl.assignments.length > 0 && (
                                <Badge variant="default">
                                  Назначен: {tpl.assignments.map((a) => a.group.name).join(", ")}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {parsedTasks.slice(0, 8).map((taskId) => {
                                const task = tasks.find((t) => t.id === taskId);
                                return task ? (
                                  <Badge key={taskId} variant="outline" className="text-xs">
                                    {task.name.length > 20 ? task.name.slice(0, 20) + "..." : task.name}
                                  </Badge>
                                ) : null;
                              })}
                              {parsedTasks.length > 8 && (
                                <Badge variant="outline" className="text-xs">
                                  +{parsedTasks.length - 8} ещё
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setViewingId(viewingId === tpl.id ? null : tpl.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(tpl)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteTemplate(tpl.id)}>
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {viewingId === tpl.id && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="space-y-2">
                              {parsedTasks.map((taskId) => {
                                const task = tasks.find((t) => t.id === taskId);
                                if (!task) return null;
                                return (
                                  <div key={taskId} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                                    <Badge className={difficultyColors[task.difficulty as Difficulty] || ""}>
                                      {task.difficulty}
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{task.name}</p>
                                      <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                                    </div>
                                    <Link href={`/trainer?task=${task.id}`} target="_blank">
                                      <Button size="sm" variant="ghost">
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </Link>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Редактирование шаблона" : "Создание шаблона"}</DialogTitle>
            <DialogDescription>
              Выберите задания, которые войдут в программу курса
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input placeholder="Название шаблона" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                placeholder="Краткое описание программы..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Примерное время (часов)</Label>
                <Input
                  type="number"
                  placeholder="10"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                />
              </div>
              <div className="space-y-2 flex items-end">
                <div className="text-sm text-muted-foreground">
                  Выбрано: <Badge variant="secondary">{selectedTasks.length}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Задания</Label>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                      selectedTasks.includes(task.id)
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                    onClick={() => toggleTask(task.id)}
                  >
                    <Badge className={difficultyColors[task.difficulty] || ""}>
                      {task.difficulty}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                    </div>
                    <div className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0">
                      {selectedTasks.includes(task.id) && (
                        <div className="w-3 h-3 rounded bg-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={saveTemplate} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {editingId ? "Сохранить" : "Создать шаблон"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TeacherLayout>
  );
}
