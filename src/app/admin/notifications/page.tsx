"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  AlertTriangle,
  TrendingDown,
  Clock,
  UserX,
  ArrowRight,
  BookOpen,
  CheckCircle,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  message: string | null;
  createdAt: string;
  read: boolean;
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  LOW_PERFORMER: { label: "Низкая успеваемость", icon: <AlertTriangle className="h-4 w-4" />, color: "text-rose-600" },
  DECLINING: { label: "Снижение прогресса", icon: <TrendingDown className="h-4 w-4" />, color: "text-amber-600" },
  INACTIVE: { label: "Неактивность", icon: <Clock className="h-4 w-4" />, color: "text-blue-600" },
  LOW_ENGAGEMENT: { label: "Низкая вовлечённость", icon: <UserX className="h-4 w-4" />, color: "text-purple-600" },
  POOR_EC_COVERAGE: { label: "Плохое покрытие EC", icon: <BookOpen className="h-4 w-4" />, color: "text-orange-600" },
  POOR_BV_COVERAGE: { label: "Плохое покрытие BV", icon: <BookOpen className="h-4 w-4" />, color: "text-cyan-600" },
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teacher/notifications")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Уведомления</h2>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} новых</Badge>
            )}
          </div>
          <Link href="/admin/analytics/predictions" className="text-sm text-muted-foreground hover:text-foreground">
            Полный анализ рисков <ArrowRight className="inline h-3 w-3 ml-1" />
          </Link>
        </div>

        {notifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-600" />
              <p className="text-muted-foreground">Нет уведомлений за последние 7 дней</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const cfg = typeConfig[n.type] || { label: n.type, icon: <Bell className="h-4 w-4" />, color: "text-muted-foreground" };
              return (
                <Card key={n.id} className={n.read ? "" : "border-amber-200 bg-amber-50/30"}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cfg.color}>{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={n.read ? "outline" : "default"} className="text-xs">{cfg.label}</Badge>
                          {!n.read && <Badge variant="destructive" className="text-xs">Новое</Badge>}
                        </div>
                        {n.message && <p className="text-sm text-muted-foreground">{n.message}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(n.createdAt).toLocaleString("ru-RU")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
