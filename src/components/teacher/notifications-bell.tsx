"use client";

import { AlertTriangle, TrendingDown, Clock, UserX } from "lucide-react";
import { NotificationsBell as NotificationsBellBase } from "@/components/notifications-bell";

const iconMap = {
  LOW_PERFORMER: <AlertTriangle className="h-4 w-4 text-rose-600" />,
  DECLINING: <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  INACTIVE: <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
  LOW_ENGAGEMENT: <UserX className="h-4 w-4 text-purple-600" />,
};

const labelKeyMap: Record<string, string> = {
  LOW_PERFORMER: "notifLowPerformer",
  DECLINING: "notifDeclining",
  INACTIVE: "notifInactive",
  LOW_ENGAGEMENT: "notifLowEngagement",
};

export function NotificationsBell() {
  return (
    <NotificationsBellBase
      apiEndpoint="/api/teacher/notifications"
      translationNamespace="teacherNav"
      logPrefix="teacher"
      iconMap={iconMap}
      labelKeyMap={labelKeyMap}
    />
  );
}
