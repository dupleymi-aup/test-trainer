"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Users, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useSWRApi } from "@/hooks/use-swr-api";
import { mutate as swrMutate } from "swr";

interface Group {
  id: string;
  name: string;
  description: string | null;
  _count: { members: number };
  createdAt: string;
}

interface GroupsData {
  groups: Group[];
}

export default function TeacherGroupsPage() {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  // Member management
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string | null; email: string | null }[]>([]);
  const [availableStudents, setAvailableStudents] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [addStudentId, setAddStudentId] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);

  // Fetch groups via SWR (cached across all teacher pages)
  const { data: groupsData, isLoading } = useSWRApi<GroupsData>("/api/teacher/groups");
  const groups = groupsData?.groups || [];

  const createGroup = async () => {
    if (!name.trim()) return;
    const res = await apiFetch("/api/teacher/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description: desc }) });
    if (res.ok) { toast.success("Группа создана"); setName(""); setDesc(""); swrMutate("/api/teacher/groups"); }
  };

  const deleteGroup = async (id: string) => {
    const res = await apiFetch(`/api/teacher/groups/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Группа удалена"); swrMutate("/api/teacher/groups"); }
  };

  const openMembersModal = async (group: Group) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
    setMembersLoading(true);
    try {
      const [membersRes, studentsRes] = await Promise.all([
        fetch(`/api/teacher/groups/${group.id}/members`),
        fetch("/api/teacher/students"),
      ]);
      if (!membersRes.ok) throw new Error(`HTTP ${membersRes.status}`);
      if (!studentsRes.ok) throw new Error(`HTTP ${studentsRes.status}`);
      const membersData = await membersRes.json();
      const studentsData = await studentsRes.json();
      setMembers(membersData.members || []);
      const memberIds = new Set((membersData.members || []).map((m: { id: string }) => m.id));
      setAvailableStudents((studentsData.students || []).filter((s: { id: string }) => !memberIds.has(s.id)));
    } catch {
      toast.error("Ошибка при загрузке данных");
    } finally {
      setMembersLoading(false);
    }
  };

  const addStudent = async () => {
    if (!addStudentId || !selectedGroup) return;
    setAddingStudent(true);
    try {
      const res = await apiFetch(`/api/teacher/groups/${selectedGroup.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: addStudentId }),
      });
      if (res.ok) {
        toast.success("Студент добавлен");
        setAddStudentId("");
        openMembersModal(selectedGroup);
      } else {
        const data = await res.json();
        toast.error(data.error || "Ошибка при добавлении");
      }
    } catch {
      toast.error("Ошибка при добавлении");
    } finally {
      setAddingStudent(false);
    }
  };

  const removeStudent = async (userId: string) => {
    if (!selectedGroup) return;
    const res = await apiFetch(`/api/teacher/groups/${selectedGroup.id}/members?userId=${userId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Студент удалён");
      openMembersModal(selectedGroup);
    }
  };

  if (isLoading) return <TeacherLayout><div className="p-8 text-center">Загрузка...</div></TeacherLayout>;

  return (
    <TeacherLayout>
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Создать группу</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
            <Input placeholder="Описание" value={desc} onChange={(e) => setDesc(e.target.value)} className="flex-1" />
            <Button onClick={createGroup}><Plus className="h-4 w-4 mr-1" /> Создать</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Группы</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Название</TableHead><TableHead>Описание</TableHead><TableHead><Users className="h-4 w-4" /></TableHead><TableHead>Дата</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
              <TableBody>
                {groups.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{g.description || "—"}</TableCell>
                    <TableCell>{g._count.members}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(g.createdAt).toLocaleDateString("ru-RU")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => openMembersModal(g)}>
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteGroup(g.id)}>Удалить</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Members Management Dialog */}
      <Dialog open={showMembersModal} onOpenChange={setShowMembersModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Управление студентами — {selectedGroup?.name}</DialogTitle>
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
              {/* Add student */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-1 block">Добавить студента</label>
                  <Select value={addStudentId} onValueChange={setAddStudentId}>
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
                <Button onClick={addStudent} disabled={!addStudentId || addingStudent}>
                  {addingStudent && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Добавить
                </Button>
              </div>

              {/* Members list */}
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
                            <Button variant="ghost" size="sm" onClick={() => removeStudent(m.id)}>
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
    </TeacherLayout>
  );
}
