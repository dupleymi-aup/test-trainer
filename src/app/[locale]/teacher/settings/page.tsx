"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Bell, User, Shield } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

export default function TeacherSettingsPage() {
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", university: "", bio: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/auth/profile", { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setProfile({ name: d.name || "", email: d.email || "", phone: d.phone || "", university: d.university || "", bio: d.bio || "" }); setLoading(false); })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) toast.success("Профиль обновлён");
      else toast.error("Ошибка обновления");
    } catch { toast.error("Ошибка при сохранении"); }
    setSaving(false);
  };

  if (loading) return <TeacherLayout><div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div></TeacherLayout>;

  return (
    <TeacherLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Настройки преподавателя</h2>
          <p className="text-muted-foreground text-sm">Управление профилем и уведомлениями</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Профиль</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Имя</Label><Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Телефон</Label><Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Университет</Label><Input value={profile.university} onChange={(e) => setProfile((p) => ({ ...p, university: e.target.value }))} /></div>
            </div>
            <div><Label>О себе</Label><Input value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} /></div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Сохранить
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Уведомления</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Настройки уведомлений доступны через колокольчик в верхней панели.</p>
            <p>Вы будете получать оповещения о:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Студентах группы риска в ваших группах</li>
              <li>Приближающихся дедлайнах</li>
              <li>Новых сообщениях от студентов</li>
              <li>Системных отчётах и предупреждениях</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Доступ</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Ваша роль: <strong className="text-foreground">Преподаватель</strong></p>
            <p className="mt-2">Доступные возможности:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Управление группами студентов</li>
              <li>Просмотр прогресса и аналитики студентов</li>
              <li>Создание заданий и шаблонов курсов</li>
              <li>Выставление оценок</li>
              <li>Отправка объявлений и сообщений</li>
              <li>Экспорт отчётов</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}
