"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface Setting {
  key: string;
  value: unknown;
  updatedAt: string;
}

const settingMeta: Record<string, { label: string; description: string; group: string }> = {
  maxLoginAttempts: { label: "Максимум попыток входа", description: "Количество попыток до блокировки", group: "Безопасность" },
  sessionDuration: { label: "Длительность сессии", description: "В секундах (86400 = 24ч)", group: "Безопасность" },
  passwordMinLength: { label: "Мин. длина пароля", description: "Минимальная длина пароля при регистрации", group: "Безопасность" },
  rateLimitWindow: { label: "Окно rate limit", description: "В секундах (900 = 15 мин)", group: "Безопасность" },
  allowRegistration: { label: "Разрешить регистрацию", description: "Разрешить самостоятельную регистрацию", group: "Общие" },
  emailNotifications: { label: "Email уведомления", description: "Отправлять уведомления по email", group: "Уведомления" },
  smsNotifications: { label: "SMS уведомления", description: "Отправлять уведомления по SMS", group: "Уведомления" },
  defaultReminderSchedule: { label: "Расписание напоминаний", description: "Дни до дедлайна (JSON массив, напр. [7,3,1,0,-1])", group: "Уведомления" },
  dataRetentionDays: { label: "Хранение данных", description: "Дней хранения попыток", group: "Общие" },
};

const groupOrder = ["Общие", "Безопасность", "Уведомления"];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = () => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.settings);
        const locals: Record<string, unknown> = {};
        data.settings.forEach((s: Setting) => { locals[s.key] = s.value; });
        setLocalValues(locals);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchSettings(); }, []);

  const updateSetting = async (key: string, value: unknown) => {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) {
      toast.success("Настройка сохранена");
    }
  };

  const handleLocalChange = (key: string, value: unknown) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleBlur = (key: string, originalValue: unknown) => {
    const newVal = localValues[key];
    if (newVal !== originalValue) {
      updateSetting(key, typeof originalValue === "number" ? parseInt(String(newVal)) : newVal);
      fetchSettings();
    }
  };

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;

  // Group settings
  const grouped: Record<string, Setting[]> = {};
  settings.forEach((s) => {
    const meta = settingMeta[s.key];
    const group = meta?.group || "Прочее";
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(s);
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Системные настройки</h2>
          <Button variant="outline" size="sm" onClick={fetchSettings}>
            <RefreshCw className="h-4 w-4 mr-1" /> Обновить
          </Button>
        </div>

        {groupOrder.filter((g) => grouped[g]).map((group) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="text-sm">{group}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {grouped[group].map((setting) => {
                const meta = settingMeta[setting.key];
                const localVal = localValues[setting.key] ?? setting.value;
                return (
                  <div key={setting.key} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{meta?.label || setting.key}</p>
                      {meta?.description && <p className="text-xs text-muted-foreground">{meta.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {typeof setting.value === "boolean" ? (
                        <Switch
                          checked={localVal as boolean}
                          onCheckedChange={(v) => {
                            handleLocalChange(setting.key, v);
                            updateSetting(setting.key, v);
                            fetchSettings();
                          }}
                        />
                      ) : (
                        <Input
                          type={typeof setting.value === "number" ? "number" : "text"}
                          value={typeof localVal === "string" && localVal.startsWith("[") ? localVal : String(localVal)}
                          className={setting.key === "defaultReminderSchedule" ? "w-48" : "w-32"}
                          onChange={(e) => handleLocalChange(setting.key, typeof setting.value === "number" ? parseInt(e.target.value) : e.target.value)}
                          onBlur={() => handleBlur(setting.key, setting.value)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
