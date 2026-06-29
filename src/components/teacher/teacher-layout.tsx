"use client";

import { LayoutDashboard, Users, FolderKanban, BarChart3, FileDown, GraduationCap, FileCode, Megaphone, BookOpen, Mail, BookTemplate, Calendar, Settings, Grid3X3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/dashboard-layout";
import { NotificationsBell } from "@/components/teacher/notifications-bell";

function useTeacherNavItems() {
  const t = useTranslations("teacherNav");

  return [
    { href: "/teacher", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/teacher/students", label: t("students"), icon: Users },
    { href: "/teacher/groups", label: t("groups"), icon: FolderKanban },
    { href: "/teacher/calendar", label: t("calendar"), icon: Calendar },
    { href: "/teacher/announcements", label: t("announcements"), icon: Megaphone },
    { href: "/teacher/gradebook", label: t("gradebook"), icon: BookOpen },
    { href: "/teacher/gradebook/matrix", label: t("gradeMatrix"), icon: Grid3X3 },
    { href: "/teacher/analytics-enhanced", label: t("analytics"), icon: BarChart3 },
    { href: "/teacher/reports", label: t("reports"), icon: FileDown },
    { href: "/teacher/task-constructor", label: t("taskConstructor"), icon: FileCode },
    { href: "/teacher/messages", label: t("messages"), icon: Mail },
    { href: "/teacher/templates", label: t("templates"), icon: BookTemplate },
    { href: "/teacher/settings", label: t("settings"), icon: Settings },
    { href: "/help", label: t("help"), icon: BookOpen },
  ];
}

export function TeacherLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("teacherNav");
  const navItems = useTeacherNavItems();

  return (
    <DashboardLayout
      navItems={navItems}
      allowedRoles={["TEACHER", "ADMIN"]}
      title={t("title")}
      titleIcon={GraduationCap}
      activeColor={{
        bg: "bg-emerald-100",
        text: "text-emerald-800",
        darkBg: "dark:bg-emerald-900/30",
        darkText: "dark:text-emerald-400",
        icon: "text-emerald-600",
      }}
      notifications={<NotificationsBell />}
    >
      {children}
    </DashboardLayout>
  );
}
