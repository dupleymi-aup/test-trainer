"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatRelativeDate } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";

export interface NotificationItem {
  id: string;
  type: string;
  message: string | null;
  createdAt: string;
  read: boolean;
}

interface NotificationsBellProps {
  apiEndpoint: string;
  translationNamespace: string;
  logPrefix: string;
  iconMap?: Record<string, ReactNode>;
  labelKeyMap?: Record<string, string>;
  defaultLabel?: (type: string) => string;
  header?: ReactNode;
  footer?: ReactNode;
}

export function NotificationsBell({
  apiEndpoint,
  translationNamespace,
  logPrefix,
  iconMap = {},
  labelKeyMap = {},
  defaultLabel = (type) => type.replace(/_/g, " "),
  header,
  footer,
}: NotificationsBellProps) {
  const locale = useLocale();
  const t = useTranslations(translationNamespace);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = () => {
      fetch(apiEndpoint)
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        })
        .catch((err) => {
          logger.warn(`Failed to fetch ${logPrefix} notifications`, {
            error: err instanceof Error ? err.message : String(err),
          });
        });
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [apiEndpoint, logPrefix]);

  const getIcon = (type: string) => iconMap[type] ?? <Bell className="h-4 w-4" />;
  const getLabel = (type: string) => {
    const key = labelKeyMap[type];
    return key ? t(key) : defaultLabel(type);
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
          <h3 className="font-semibold">{t("notificationTitle")}</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("newNotifications", { count: unreadCount })}
            </p>
          )}
        </div>
        {header}
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("noNotifications")}</p>
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={`flex items-start gap-3 p-3 cursor-default ${
                  !n.read ? "bg-muted/50" : ""
                }`}
              >
                {getIcon(n.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{getLabel(n.type)}</span>
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
                    {formatRelativeDate(n.createdAt, locale)}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        {footer}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
