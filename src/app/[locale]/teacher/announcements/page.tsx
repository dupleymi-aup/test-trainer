"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Megaphone, Plus, Trash2, Loader2, Calendar, Users } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { useSWRApi } from "@/hooks/use-swr-api";
import { mutate as swrMutate } from "swr";

interface Group {
  id: string;
  name: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  groupId: string | null;
  createdAt: string;
  expiresAt: string | null;
  group: { id: string; name: string } | null;
  creator: { id: string; name: string | null; role: string };
}

interface AnnouncementsData {
  announcements: Announcement[];
}

interface GroupsData {
  groups: Group[];
}

export default function TeacherAnnouncementsPage() {
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState("");

  // Fetch announcements & groups via SWR (cached)
  const { data: announcementsData, isLoading } = useSWRApi<AnnouncementsData>("/api/teacher/announcements");
  const { data: groupsData } = useSWRApi<GroupsData>("/api/teacher/groups");

  const announcements = announcementsData?.announcements || [];
  const groups = groupsData?.groups || [];

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Заполните заголовок и содержание");
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetch("/api/teacher/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          groupId: selectedGroup || null,
          expiresAt: expiresAt || null,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Объявление создано");
        setTitle("");
        setContent("");
        setSelectedGroup("");
        setExpiresAt("");
        setShowForm(false);
        swrMutate("/api/teacher/announcements");
      } else {
        toast.error(json.error || "Ошибка при создании");
      }
    } catch {
      toast.error("Ошибка при создании объявления");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить это объявление?")) return;
    try {
      const res = await apiFetch(`/api/teacher/announcements?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Объявление удалено");
        swrMutate("/api/teacher/announcements");
      } else {
        toast.error("Ошибка при удалении");
      }
    } catch {
      toast.error("Ошибка при удалении");
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Объявления</h2>
            <p className="text-muted-foreground">
              Публикуйте объявления для ваших групп
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Новое объявление
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Создать объявление</CardTitle>
              <CardDescription>Заполните информацию и выберите группу</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Заголовок</Label>
                <Input
                  id="title"
                  placeholder="Важное объявление"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div>
                <Label htmlFor="content">Содержание</Label>
                <Textarea
                  id="content"
                  placeholder="Текст объявления..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground mt-1">{content.length} / 5000</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Группа</Label>
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
                <div>
                  <Label>Срок действия (необязательно)</Label>
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Создать
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Announcements List */}
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="pt-8 text-center">
              <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Нет объявлений</h3>
              <p className="text-muted-foreground">
                Создайте первое объявление для ваших групп
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => (
              <Card key={ann.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle>{ann.title}</CardTitle>
                        {ann.expiresAt && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="mr-1 h-3 w-3" />
                            до {formatDate(ann.expiresAt)}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <span>{formatDate(ann.createdAt)}</span>
                        {ann.group ? (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {ann.group.name}
                          </span>
                        ) : (
                          <span>Все группы</span>
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(ann.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{ann.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
