"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Setting {
  key: string;
  value: unknown;
  updatedAt: string;
}

const settingLabels: Record<string, string> = {
  maxLoginAttempts: "Максимум попыток входа",
  sessionDuration: "Длительность сессии (секунды)",
  allowRegistration: "Разрешить регистрацию",
};

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

  useEffect(() => {
    fetchSettings();
  }, []);

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

  return (
    <AdminLayout>
      <Card>
        <CardHeader><CardTitle className="text-sm">Системные настройки</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {settings.map((setting) => {
            const localVal = localValues[setting.key] ?? setting.value;
            return (
              <div key={setting.key} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">{settingLabels[setting.key] || setting.key}</p>
                  <p className="text-xs text-muted-foreground">{setting.key}</p>
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
                      value={String(localVal)}
                      className="w-32"
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
    </AdminLayout>
  );
}
