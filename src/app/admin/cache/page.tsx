"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AdminCachePage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [invalidating, setInvalidating] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cache/invalidate");
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  const invalidateCache = async (pattern?: string) => {
    setInvalidating(true);
    try {
      const res = await fetch("/api/admin/cache/invalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern }),
      });
      if (res.ok) {
        toast.success("Кэш очищен успешно");
        fetchStats();
      } else {
        toast.error("Не удалось очистить кэш");
      }
    } catch {
      toast.error("Ошибка при очистке кэша");
    }
    setInvalidating(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Управление кэшем</h2>
            <p className="text-sm text-muted-foreground mt-1">Просмотр и управление кэшем аналитики</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Обновить
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Состояние кэша</CardTitle></CardHeader>
            <CardContent>
              {stats ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Ключей в кэше:</span><span className="font-bold">{String(stats.entries ?? stats.size ?? "—")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Попаданий:</span><span className="font-bold text-emerald-600">{String(stats.hits ?? "—")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Промахов:</span><span className="font-bold text-amber-600 dark:text-amber-400">{String(stats.misses ?? "—")}</span></div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Button variant="outline" onClick={fetchStats} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                    Загрузить статистику
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Действия</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button variant="destructive" size="sm" onClick={() => invalidateCache()} disabled={invalidating} className="w-full">
                <Trash2 className="h-3 w-3 mr-1" /> Очистить весь кэш
              </Button>
              <Button variant="outline" size="sm" onClick={() => invalidateCache("analytics:*")} disabled={invalidating} className="w-full">
                Очистить кэш аналитики
              </Button>
              <Button variant="outline" size="sm" onClick={() => invalidateCache("admin:*")} disabled={invalidating} className="w-full">
                Очистить кэш админ-панели
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">Системная информация</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="p-3 border rounded">
                <p className="text-muted-foreground text-xs">Платформа</p>
                <p className="font-mono text-xs">{process.env.NEXT_PUBLIC_APP_NAME || "TestTrainer"}</p>
              </div>
              <div className="p-3 border rounded">
                <p className="text-muted-foreground text-xs">Окружение</p>
                <Badge variant={process.env.NODE_ENV === "production" ? "destructive" : "secondary"}>{process.env.NODE_ENV || "development"}</Badge>
              </div>
              <div className="p-3 border rounded">
                <p className="text-muted-foreground text-xs">База данных</p>
                <p className="font-mono text-xs">SQLite (Prisma)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
