"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Bell, Mail, Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NotificationPreferencesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [prefs, setPrefs] = useState({ email: false, sms: false, inApp: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;

    const controller = new AbortController();
    fetch("/api/student/preferences", { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        if (!controller.signal.aborted && data.preferences) {
          setPrefs(data.preferences);
        }
        if (!controller.signal.aborted) setLoading(false);
      })
      .catch(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [status, router]);

  const savePreferences = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/student/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Настройки сохранены");
    } catch {
      toast.error("Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/student"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-xl font-bold">Уведомления</h1>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Уведомления в приложении</p>
                <p className="text-xs text-muted-foreground">Напоминания о дедлайнах и новых сообщениях</p>
              </div>
            </div>
            <Switch checked={prefs.inApp} onCheckedChange={(v) => setPrefs((p) => ({ ...p, inApp: v }))} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium">Email-уведомления</p>
                <p className="text-xs text-muted-foreground">Получайте отчёты и напоминания на почту</p>
              </div>
            </div>
            <Switch checked={prefs.email} onCheckedChange={(v) => setPrefs((p) => ({ ...p, email: v }))} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium">SMS-уведомления</p>
                <p className="text-xs text-muted-foreground">Срочные напоминания по SMS</p>
              </div>
            </div>
            <Switch checked={prefs.sms} onCheckedChange={(v) => setPrefs((p) => ({ ...p, sms: v }))} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={savePreferences} disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Сохранить настройки
      </Button>
    </div>
  );
}
