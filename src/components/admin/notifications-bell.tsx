"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Check, AlertTriangle, TrendingDown, Clock, UserX, BookOpen } from "lucide-react";
import { formatRelativeDate } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";

interface Notification {
  id: string;
  type: string;
  message: string | null;
  createdAt: string;
  read: boolean;
}

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/notifications?unreadOnly=true&limit=20")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch((err) => {
        logger.warn("Failed to fetch admin notifications", { error: err instanceof Error ? err.message : String(err) });
      });
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "LOW_PERFORMER": case "RISK_THRESHOLD":
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      case "DECLINING": case "SCORE_DROP":
        return <TrendingDown className="h-4 w-4 text-amber-600" />;
      case "INACTIVE": case "INACTIVE_GROUPS":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "LOW_ENGAGEMENT":
        return <UserX className="h-4 w-4 text-purple-600" />;
      case "POOR_EC_COVERAGE": case "POOR_BV_COVERAGE":
        return <BookOpen className="h-4 w-4 text-orange-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationLabel = (type: string) => {
    switch (type) {
      case "LOW_PERFORMER": return "Низкий балл";
      case "DECLINING": return "Снижение тренда";
      case "INACTIVE": return "Неактивный студент";
      case "LOW_ENGAGEMENT": return "Мало попыток";
      case "POOR_EC_COVERAGE": return "Плохое покрытие EC";
      case "POOR_BV_COVERAGE": return "Плохое покрытие BV";
      case "RISK_THRESHOLD": return "Превышен порог риска";
      case "INACTIVE_GROUPS": return "Неактивные группы";
      case "SCORE_DROP": return "Снижение среднего балла";
      case "SCHEDULED_REPORT": return "Автоматический отчёт";
      case "DEADLINE_APPROACHING": return "Срок подходит к концу";
      default: return type.replace(/_/g, " ");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-3 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Уведомления</h3>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {unreadCount} новых
              </p>
            )}
          </div>
          <Link href="/admin/notifications">
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              <Check className="h-3 w-3 mr-1" /> Все
            </Button>
          </Link>
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Нет уведомлений</p>
            </div>
          ) : (
            notifications.slice(0, 20).map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={`flex items-start gap-3 p-3 cursor-default ${
                  !n.read ? "bg-muted/50" : ""
                }`}
              >
                {getNotificationIcon(n.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {getNotificationLabel(n.type)}
                    </span>
                    {!n.read && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  {n.message && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {n.message}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatRelativeDate(n.createdAt)}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/notifications" className="text-center text-xs justify-center">
            Все уведомления →
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
