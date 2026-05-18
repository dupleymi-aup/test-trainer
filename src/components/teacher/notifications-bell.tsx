"use client";

import { useState, useEffect } from "react";
import { Bell, Check, AlertTriangle, TrendingDown, Clock, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/teacher/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "LOW_PERFORMER":
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      case "DECLINING":
        return <TrendingDown className="h-4 w-4 text-amber-600" />;
      case "INACTIVE":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "LOW_ENGAGEMENT":
        return <UserX className="h-4 w-4 text-purple-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationLabel = (type: string) => {
    switch (type) {
      case "LOW_PERFORMER":
        return "Низкий балл";
      case "DECLINING":
        return "Снижение тренда";
      case "INACTIVE":
        return "Неактивный студент";
      case "LOW_ENGAGEMENT":
        return "Мало попыток";
      default:
        return type;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Только что";
    if (diffHours < 24) return `${diffHours}ч назад`;
    if (diffDays < 7) return `${diffDays}д назад`;
    return date.toLocaleDateString("ru-RU");
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
        <div className="p-3 border-b">
          <h3 className="font-semibold">Уведомления</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {unreadCount} новых уведомлений
            </p>
          )}
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Нет уведомлений</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-3 p-3 cursor-default ${
                  !notification.read ? "bg-muted/50" : ""
                }`}
              >
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {getNotificationLabel(notification.type)}
                    </span>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
