"use client";

import { LayoutDashboard, Users, FolderKanban, BarChart3, FileDown, GraduationCap, FileCode, Megaphone, BookOpen } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { NotificationsBell } from "@/components/teacher/notifications-bell";

const navItems = [
  { href: "/teacher", label: "Панель", icon: LayoutDashboard },
  { href: "/teacher/students", label: "Студенты", icon: Users },
  { href: "/teacher/groups", label: "Группы", icon: FolderKanban },
  { href: "/teacher/announcements", label: "Объявления", icon: Megaphone },
  { href: "/teacher/gradebook", label: "Журнал оценок", icon: BookOpen },
  { href: "/teacher/analytics-enhanced", label: "Аналитика", icon: BarChart3 },
  { href: "/teacher/reports", label: "Отчёты", icon: FileDown },
  { href: "/teacher/task-constructor", label: "Конструктор заданий", icon: FileCode },
];

export function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      navItems={navItems}
      allowedRoles={["TEACHER", "ADMIN"]}
      title="Панель преподавателя"
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
