"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

interface HealthStatus {
  status: string;
  tables?: Record<string, number>;
  error?: string;
  timestamp?: string;
}

export default function AdminDatabasePage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = () => {
    fetch("/api/admin/database/health")
      .then((r) => r.json())
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    checkHealth();
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Состояние базы данных</CardTitle>
            <Button variant="outline" size="sm" onClick={checkHealth}>
              <RefreshCw className="h-4 w-4 mr-1" /> Обновить
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge variant={health?.status === "healthy" ? "default" : "destructive"}>
                {health?.status === "healthy" ? "Здорова" : "Ошибка"}
              </Badge>
              {health?.timestamp && (
                <span className="text-xs text-muted-foreground">
                  Проверено: {new Date(health.timestamp).toLocaleString("ru-RU")}
                </span>
              )}
            </div>
            {health?.error && (
              <p className="text-sm text-rose-600 mt-2">{health.error}</p>
            )}
          </CardContent>
        </Card>

        {health?.tables && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Таблицы</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(health.tables).map(([table, count]) => (
                  <div key={table} className="flex justify-between text-sm">
                    <span className="font-mono">{table}</span>
                    <span className="text-muted-foreground">{count} записей</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
