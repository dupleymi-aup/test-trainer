"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Users, ListChecks, Loader2, X, Search, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Group {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { members: number };
  createdBy: { name: string | null; email: string | null };
}

interface GroupTask {
  id: number;
  name: string;
  difficulty: string;
  description: string;
  isAssigned: boolean;
}

const difficultyColors: Record<string, string> = {
  "Легко": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Средне": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  "Сложно": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  // Task management modal
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupTasks, setGroupTasks] = useState<GroupTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [taskCount, setTaskCount] = useState<Record<string, number>>({});
  const [totalTasks, setTotalTasks] = useState(15);

  // Member management
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [membersGroup, setMembersGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string | null; email: string | null; role: string }[]>([]);
  const [availableStudents, setAvailableStudents] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [addMemberId, setAddMemberId] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  // Bulk operations
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<"tasks" | "members" | "delete">("tasks");
  const [bulkTasks, setBulkTasks] = useState<GroupTask[]>([]);
  const [bulkTaskLoading, setBulkTaskLoading] = useState(false);
  const [bulkStudents, setBulkStudents] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [bulkSelectedStudents, setBulkSelectedStudents] = useState<Set<string>>(new Set());
  const [bulkStudentsLoading, setBulkStudentsLoading] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [searchGroup, setSearchGroup] = useState("");

  const fetchGroups = (signal?: AbortSignal) => {
    fetch("/api/admin/groups", { signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setGroups(data.groups);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchGroups(controller.signal);
    return () => controller.abort();
  }, []);

  // Fetch task counts for all groups
  useEffect(() => {
    const controller = new AbortController();
    const counts: Record<string, number> = {};
    const promises = groups.map(async (g) => {
      try {
        const res = await fetch(`/api/admin/groups/${g.id}/tasks`, { signal: controller.signal });
        if (!res.ok) {
          counts[g.id] = 0;
          return;
        }
        const data = await res.json();
        counts[g.id] = data.tasks?.filter((t: GroupTask) => t.isAssigned).length || 0;
      } catch {
        counts[g.id] = 0;
      }
    });
    Promise.all(promises).then(() => setTaskCount(counts)).catch(() => setTaskCount(counts));
    return () => controller.abort();
  }, [groups]);

  const handleCreate = async () => {
    if (!newGroupName.trim()) return;
    const res = await apiFetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroupName, description: newGroupDesc }),
    });
    if (res.ok) {
      toast.success("Группа создана");
      setNewGroupName("");
      setNewGroupDesc("");
      fetchGroups();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await apiFetch(`/api/admin/groups/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Группа удалена");
      fetchGroups();
    }
  };

  const openTasksModal = async (group: Group) => {
    setSelectedGroup(group);
    setShowTasksModal(true);
    setTasksLoading(true);
    try {
      const res = await fetch(`/api/admin/groups/${group.id}/tasks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGroupTasks(data.tasks || []);
      setTotalTasks(data.tasks?.length || 15);
    } catch {
      toast.error("Ошибка при загрузке заданий");
    } finally {
      setTasksLoading(false);
    }
  };

  const toggleTask = (taskId: number) => {
    setGroupTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isAssigned: !t.isAssigned } : t))
    );
  };

  const selectAll = () => {
    setGroupTasks((prev) => prev.map((t) => ({ ...t, isAssigned: true })));
  };

  const deselectAll = () => {
    setGroupTasks((prev) => prev.map((t) => ({ ...t, isAssigned: false })));
  };

  const handleSaveTasks = async () => {
    if (!selectedGroup) return;
    setIsSaving(true);
    try {
      const assignedIds = groupTasks.filter((t) => t.isAssigned).map((t) => t.id);
      const res = await apiFetch(`/api/admin/groups/${selectedGroup.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: assignedIds }),
      });
      if (res.ok) {
        toast.success("Задания сохранены");
        setShowTasksModal(false);
        setTaskCount((prev) => ({ ...prev, [selectedGroup.id]: assignedIds.length }));
      } else {
        const data = await res.json();
        toast.error(data.error || "Ошибка при сохранении");
      }
    } catch {
      toast.error("Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  const openMembersModal = async (group: Group) => {
    setMembersGroup(group);
    setShowMembersModal(true);
    setMembersLoading(true);
    try {
      const [membersRes, studentsRes] = await Promise.all([
        fetch(`/api/admin/groups/${group.id}/members`),
        fetch("/api/admin/users?limit=1000"),
      ]);
      if (!membersRes.ok || !studentsRes.ok) throw new Error(`HTTP error`);
      const membersData = await membersRes.json();
      const studentsData = await studentsRes.json();
      setMembers(membersData.members || []);
      const memberIds = new Set((membersData.members || []).map((m: { id: string }) => m.id));
      setAvailableStudents(
        (studentsData.users || [])
          .filter((u: { role: string }) => u.role === "STUDENT")
          .filter((s: { id: string }) => !memberIds.has(s.id))
          .map((s: { id: string; name: string | null; email: string | null }) => ({
            id: s.id,
            name: s.name,
            email: s.email || "",
          }))
      );
    } catch {
      toast.error("Ошибка при загрузке данных");
    } finally {
      setMembersLoading(false);
    }
  };

  const addMember = async () => {
    if (!addMemberId || !membersGroup) return;
    setAddingMember(true);
    try {
      const res = await apiFetch(`/api/admin/groups/${membersGroup.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: addMemberId }),
      });
      if (res.ok) {
        toast.success("Студент добавлен");
        setAddMemberId("");
        openMembersModal(membersGroup);
      } else {
        const data = await res.json();
        toast.error(data.error || "Ошибка при добавлении");
      }
    } catch {
      toast.error("Ошибка при добавлении");
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!membersGroup) return;
    const res = await apiFetch(`/api/admin/groups/${membersGroup.id}/members?userId=${userId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Студент удалён");
      openMembersModal(membersGroup);
    }
  };

  // Bulk operations
  const toggleGroupSelect = (id: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllGroups = () => {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(filteredGroups.map((g) => g.id)));
    }
  };

  const openBulkModal = async (action: "tasks" | "members" | "delete") => {
    if (selectedGroups.size === 0) return;
    setBulkAction(action);
    setShowBulkModal(true);

    if (action === "tasks") {
      setBulkTaskLoading(true);
      try {
        const res = await fetch(`/api/admin/groups/${selectedGroups.values().next().value}/tasks`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setBulkTasks(data.tasks || []);
      } catch {
        toast.error("Ошибка загрузки заданий");
      } finally {
        setBulkTaskLoading(false);
      }
    } else if (action === "members") {
      setBulkStudentsLoading(true);
      try {
        const res = await fetch("/api/admin/users?limit=1000");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setBulkStudents(
          (data.users || [])
            .filter((u: { role: string }) => u.role === "STUDENT")
            .map((s: { id: string; name: string | null; email: string }) => ({ id: s.id, name: s.name, email: s.email }))
        );
      } catch {
        toast.error("Ошибка загрузки студентов");
      } finally {
        setBulkStudentsLoading(false);
      }
    }
  };

  const toggleBulkTask = (taskId: number) => {
    setBulkTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, isAssigned: !t.isAssigned } : t)));
  };

  const toggleBulkStudent = (id: string) => {
    setBulkSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const executeBulkAction = async () => {
    setBulkProcessing(true);
    const groupIds = Array.from(selectedGroups);
    let success = 0;
    let errors = 0;

    try {
      if (bulkAction === "tasks") {
        const assignedIds = bulkTasks.filter((t) => t.isAssigned).map((t) => t.id);
        for (const gid of groupIds) {
          try {
            const res = await apiFetch(`/api/admin/groups/${gid}/tasks`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ taskIds: assignedIds }),
            });
            if (res.ok) success++; else errors++;
          } catch (e) {
            logger.error("Bulk task assignment failed for group", { groupId: gid, error: e instanceof Error ? e.message : String(e) });
            errors++;
          }
        }
        const counts: Record<string, number> = {};
        groupIds.forEach((gid) => { counts[gid] = assignedIds.length; });
        setTaskCount((prev) => ({ ...prev, ...counts }));
      } else if (bulkAction === "members") {
        const studentIds = Array.from(bulkSelectedStudents);
        for (const gid of groupIds) {
          for (const sid of studentIds) {
            try {
              await apiFetch(`/api/admin/groups/${gid}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: sid }),
              });
              success++;
            } catch (e) {
              logger.error("Bulk member addition failed", { groupId: gid, userId: sid, error: e instanceof Error ? e.message : String(e) });
              errors++;
            }
          }
        }
      } else if (bulkAction === "delete") {
        for (const gid of groupIds) {
          try {
            const res = await apiFetch(`/api/admin/groups/${gid}`, { method: "DELETE" });
            if (res.ok) success++; else errors++;
          } catch (e) {
            logger.error("Bulk group deletion failed", { groupId: gid, error: e instanceof Error ? e.message : String(e) });
            errors++;
          }
        }
        fetchGroups();
      }

      toast.success(`Обработано: ${success} успешно, ${errors} ошибок`);
      setShowBulkModal(false);
      setSelectedGroups(new Set());
      setBulkSelectedStudents(new Set());
    } finally {
      setBulkProcessing(false);
    }
  };

  const filteredGroups = groups.filter((g) =>
    !searchGroup || g.name.toLowerCase().includes(searchGroup.toLowerCase()) || (g.description || "").toLowerCase().includes(searchGroup.toLowerCase())
  );

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Создать группу</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input placeholder="Название" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="flex-1" />
            <Input placeholder="Описание" value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} className="flex-1" />
            <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1" /> Создать</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Группы</CardTitle></CardHeader>
          <CardContent className="p-0">
            {selectedGroups.size > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b">
                <span className="text-sm font-medium">Выбрано: {selectedGroups.size}</span>
                <Button size="sm" variant="outline" onClick={() => openBulkModal("tasks")}>
                  <ListChecks className="h-4 w-4 mr-1" /> Задания
                </Button>
                <Button size="sm" variant="outline" onClick={() => openBulkModal("members")}>
                  <Users className="h-4 w-4 mr-1" /> Участники
                </Button>
                <Button size="sm" variant="outline" onClick={() => openBulkModal("delete")}>
                  <X className="h-4 w-4 mr-1" /> Удалить
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedGroups(new Set())}>
                  Снять
                </Button>
              </div>
            )}
            <div className="px-4 py-2 border-b">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск групп..."
                  value={searchGroup}
                  onChange={(e) => setSearchGroup(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <button onClick={selectAllGroups} className="flex items-center" aria-label="Выбрать все группы">
                      {selectedGroups.size === filteredGroups.length && filteredGroups.length > 0 ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Создатель</TableHead>
                  <TableHead><Users className="h-4 w-4" /></TableHead>
                  <TableHead><ListChecks className="h-4 w-4" /></TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((g) => (
                  <TableRow key={g.id} className={selectedGroups.has(g.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <button onClick={() => toggleGroupSelect(g.id)} className="flex items-center" aria-label={`Выбрать группу ${g.name}`}>
                        {selectedGroups.has(g.id) ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{g.description || "—"}</TableCell>
                    <TableCell className="text-sm">{g.createdBy.name || g.createdBy.email}</TableCell>
                    <TableCell>{g._count.members}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {taskCount[g.id] || 0}/{totalTasks}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(g.createdAt).toLocaleDateString("ru-RU")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => openMembersModal(g)}>
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openTasksModal(g)}>
                          <ListChecks className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(g.id)}>Удалить</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Task Management Dialog */}
      <Dialog open={showTasksModal} onOpenChange={setShowTasksModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Задания для группы &laquo;{selectedGroup?.name}&raquo;</DialogTitle>
            <DialogDescription>
              Выберите задания, которые будут доступны участникам этой группы. Отмеченные задания станут доступными для студентов.
            </DialogDescription>
          </DialogHeader>

          {tasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Загрузка заданий...</span>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Выбрать все
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Снять все
                </Button>
                <span className="text-sm text-muted-foreground ml-auto">
                  Выбрано: {groupTasks.filter((t) => t.isAssigned).length} / {totalTasks}
                </span>
              </div>

              <div className="overflow-y-auto flex-1 pr-1">
                <div className="space-y-1">
                  {groupTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={task.isAssigned}
                        onCheckedChange={() => toggleTask(task.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono text-muted-foreground">#{task.id}</span>
                          <span className="font-medium text-sm">{task.name}</span>
                          <Badge className={difficultyColors[task.difficulty]} variant="outline">
                            {task.difficulty}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTasksModal(false)}>
                  Отмена
                </Button>
                <Button onClick={handleSaveTasks} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Сохранить
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Members Management Dialog */}
      <Dialog open={showMembersModal} onOpenChange={setShowMembersModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Управление участниками — {membersGroup?.name}</DialogTitle>
            <DialogDescription>
              Добавьте или удалите студентов из этой группы
            </DialogDescription>
          </DialogHeader>

          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Загрузка...</span>
            </div>
          ) : (
            <>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-1 block">Добавить студента</label>
                  <Select value={addMemberId} onValueChange={setAddMemberId}>
                    <SelectTrigger>
                      <SelectValue placeholder={availableStudents.length === 0 ? "Нет доступных студентов" : "Выберите студента"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudents.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name || s.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addMember} disabled={!addMemberId || addingMember}>
                  {addingMember && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Добавить
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          Нет студентов в группе
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.name || "—"}</TableCell>
                          <TableCell>{m.email || "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)}>
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMembersModal(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Operations Dialog */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {bulkAction === "tasks" && `Назначить задания для ${selectedGroups.size} групп`}
              {bulkAction === "members" && `Добавить студентов в ${selectedGroups.size} групп`}
              {bulkAction === "delete" && `Удалить ${selectedGroups.size} групп`}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === "tasks" && "Выбранные задания будут назначены всем выбранным группам"}
              {bulkAction === "members" && "Выбранные студенты будут добавлены во все выбранные группы"}
              {bulkAction === "delete" && "Это действие нельзя отменить. Все данные групп будут удалены."}
            </DialogDescription>
          </DialogHeader>

          {bulkAction === "tasks" && (
            bulkTaskLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Загрузка заданий...</span>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-2">
                  <Button variant="outline" size="sm" onClick={() => setBulkTasks((prev) => prev.map((t) => ({ ...t, isAssigned: true })))}>
                    Выбрать все
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setBulkTasks((prev) => prev.map((t) => ({ ...t, isAssigned: false })))}>
                    Снять все
                  </Button>
                  <span className="text-sm text-muted-foreground ml-auto">
                    Выбрано: {bulkTasks.filter((t) => t.isAssigned).length}
                  </span>
                </div>
                <div className="overflow-y-auto flex-1 pr-1">
                  <div className="space-y-1">
                    {bulkTasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50">
                        <Checkbox checked={task.isAssigned} onCheckedChange={() => toggleBulkTask(task.id)} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-mono text-muted-foreground">#{task.id}</span>
                            <span className="font-medium text-sm">{task.name}</span>
                            <Badge className={difficultyColors[task.difficulty]} variant="outline">{task.difficulty}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          )}

          {bulkAction === "members" && (
            bulkStudentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Загрузка студентов...</span>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-2">
                  <Button variant="outline" size="sm" onClick={() => setBulkSelectedStudents(new Set(bulkStudents.map((s) => s.id)))}>
                    Выбрать всех
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setBulkSelectedStudents(new Set())}>
                    Снять всех
                  </Button>
                  <span className="text-sm text-muted-foreground ml-auto">
                    Выбрано: {bulkSelectedStudents.size}
                  </span>
                </div>
                <div className="overflow-y-auto flex-1 pr-1">
                  <div className="space-y-1">
                    {bulkStudents.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50">
                        <Checkbox checked={bulkSelectedStudents.has(s.id)} onCheckedChange={() => toggleBulkStudent(s.id)} />
                        <span className="font-medium text-sm">{s.name || s.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          )}

          {bulkAction === "delete" && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Группы будут удалены ({selectedGroups.size} шт.)
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkModal(false)} disabled={bulkProcessing}>
              Отмена
            </Button>
            <Button
              variant={bulkAction === "delete" ? "destructive" : "default"}
              onClick={executeBulkAction}
              disabled={bulkProcessing}
            >
              {bulkProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bulkAction === "tasks" && "Назначить"}
              {bulkAction === "members" && "Добавить"}
              {bulkAction === "delete" && "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
