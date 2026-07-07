"use client";

import Link from "next/link";
import { AlertTriangle, TrendingDown, Clock, UserX, BookOpen, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { NotificationsBell as SharedNotificationsBell } from "@/components/notifications-bell";

const iconMap = {
  LOW_PERFORMER: <AlertTriangle className="h-4 w-4 text-rose-600" />,
  RISK_THRESHOLD: <AlertTriangle className="h-4 w-4 text-rose-600" />,
  DECLINING: <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  SCORE_DROP: <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  INACTIVE: <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
  INACTIVE_GROUPS: <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
  LOW_ENGAGEMENT: <UserX className="h-4 w-4 text-purple-600" />,
  POOR_EC_COVERAGE: <BookOpen className="h-4 w-4 text-orange-600" />,
  POOR_BV_COVERAGE: <BookOpen className="h-4 w-4 text-orange-600" />,
};

const labelKeyMap: Record<string, string> = {
  LOW_PERFORMER: "notifLowPerformer",
  DECLINING: "notifDeclining",
  INACTIVE: "notifInactive",
  LOW_ENGAGEMENT: "notifLowEngagement",
  POOR_EC_COVERAGE: "notifPoorECCoverage",
  POOR_BV_COVERAGE: "notifPoorBVCoverage",
  RISK_THRESHOLD: "notifRiskThreshold",
  INACTIVE_GROUPS: "notifInactiveGroups",
  SCORE_DROP: "notifScoreDrop",
  SCHEDULED_REPORT: "notifScheduledReport",
  DEADLINE_APPROACHING: "notifDeadlineApproaching",
};

function AdminHeader() {
  const t = useTranslations("adminNav");
  return (
    <div className="flex items-center justify-between -mt-1 mb-1">
      <span />
      <Link href="/admin/notifications">
        <Button variant="ghost" size="sm" className="h-6 text-xs">
          <Check className="h-3 w-3 mr-1" /> {t("markAllRead")}
        </Button>
      </Link>
    </div>
  );
}

function AdminFooter() {
  const t = useTranslations("adminNav");
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/admin/notifications" className="text-center text-xs justify-center">
          {t("viewAllNotifications")}
        </Link>
      </DropdownMenuItem>
    </>
  );
}

export function NotificationsBell() {
  return (
    <SharedNotificationsBell
      apiEndpoint="/api/admin/notifications?unreadOnly=true&limit=20"
      translationNamespace="adminNav"
      logPrefix="admin"
      iconMap={iconMap}
      labelKeyMap={labelKeyMap}
      header={<AdminHeader />}
      footer={<AdminFooter />}
    />
  );
}
