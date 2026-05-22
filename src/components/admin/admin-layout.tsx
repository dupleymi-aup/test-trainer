"use client";

import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ScrollText,
  Database,
  Settings,
  Shield,
  BarChart3,
  Activity,
  Target,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  Download,
  GitCompare,
  Table2,
  Trophy,
  Zap,
  Route,
  Bell,
  Crosshair,
  Calendar,
  Lightbulb,
  Clock,
  Layers,
  Award,
  Siren,
  CalendarClock,
  Route as TimelineIcon,
  GitBranch,
  LineChart as LineChartIcon,
  ClipboardList,
  Users2,
  ListFilter,
  type LucideIcon,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { NotificationsBell } from "@/components/admin/notifications-bell";

interface NavGroup {
  label: string;
  items: Array<{ href: string; label: string; icon: LucideIcon }>;
}

const navGroups: NavGroup[] = [
  {
    label: "Основное",
    items: [
      { href: "/admin", label: "Панель управления", icon: LayoutDashboard },
      { href: "/admin/users", label: "Пользователи", icon: Users },
      { href: "/admin/groups", label: "Группы", icon: FolderKanban },
    ],
  },
  {
    label: "Аналитика",
    items: [
      { href: "/admin/analytics", label: "Обзор платформы", icon: BarChart3 },
      { href: "/admin/analytics/comprehensive", label: "Комплексная аналитика", icon: Target },
      { href: "/admin/analytics/predictions", label: "Прогнозы и риски", icon: AlertTriangle },
      { href: "/admin/analytics/at-risk", label: "Студенты группы риска", icon: AlertTriangle },
      { href: "/admin/analytics/improvement-leaderboard", label: "Лидеры улучшений", icon: Trophy },
      { href: "/admin/analytics/velocity", label: "Скорость обучения", icon: Zap },
      { href: "/admin/analytics/learning-path", label: "Путь обучения", icon: Route },
      { href: "/admin/analytics/skill-mastery", label: "Освоение навыков", icon: Layers },
    ],
  },
  {
    label: "Сравнение и тренды",
    items: [
      { href: "/admin/analytics/teacher-performance", label: "Преподаватели", icon: GraduationCap },
      { href: "/admin/analytics/teacher-comparison", label: "Сравнение преподавателей", icon: Award },
      { href: "/admin/analytics/university-comparison", label: "Университеты", icon: BookOpen },
      { href: "/admin/analytics/time-trends", label: "Тренды", icon: TrendingUp },
      { href: "/admin/analytics/compare-periods", label: "Сравнение периодов", icon: GitCompare },
      { href: "/admin/analytics/group-comparison", label: "Сравнение групп", icon: GitBranch },
      { href: "/admin/analytics/student-comparison", label: "Сравнение студентов", icon: Users2 },
    ],
  },
  {
    label: "Покрытие EC/BV",
    items: [
      { href: "/admin/analytics/task-insights", label: "Анализ задач", icon: Activity },
      { href: "/admin/analytics/ec-bv-gaps", label: "Анализ покрытия EC/BV", icon: AlertTriangle },
      { href: "/admin/analytics/ec-bv-heatmap", label: "Тепловая карта EC/BV", icon: Crosshair },
      { href: "/admin/analytics/completion-matrix", label: "Матрица выполнения", icon: Table2 },
      { href: "/admin/analytics/group-performance", label: "Успеваемость групп", icon: FolderKanban },
      { href: "/admin/analytics/performance-dashboard", label: "Успеваемость студентов", icon: ListFilter },
    ],
  },
  {
    label: "Тематический анализ",
    items: [
      { href: "/admin/analytics/topic-breakdown", label: "Анализ тем", icon: Layers },
      { href: "/admin/analytics/topic-heatmap", label: "Тепловая карта тем", icon: Target },
      { href: "/admin/analytics/cohort-retention", label: "Когортный анализ", icon: Calendar },
      { href: "/admin/analytics/time-activity", label: "Активность по времени", icon: Clock },
    ],
  },
  {
    label: "Продвинутая аналитика",
    items: [
      { href: "/admin/analytics/forecasting", label: "Прогнозирование", icon: LineChartIcon },
      { href: "/admin/analytics/anomalies", label: "Аномалии", icon: Siren },
      { href: "/admin/analytics/recommendations", label: "Рекомендации", icon: Lightbulb },
      { href: "/admin/analytics/student-timeline", label: "Траектория студента", icon: TimelineIcon },
      { href: "/admin/analytics/task-detail", label: "Детальный анализ задач", icon: ClipboardList },
      { href: "/admin/analytics/time-score-correlation", label: "Время и баллы", icon: LineChartIcon },
      { href: "/admin/analytics/completion-funnel", label: "Воронка прохождения", icon: ListFilter },
      { href: "/admin/analytics/error-patterns", label: "Типичные ошибки", icon: Siren },
      { href: "/admin/analytics/item-difficulty", label: "Сложность заданий", icon: Target },
    ],
  },
  {
    label: "Система",
    items: [
      { href: "/admin/alerts", label: "Системные алерты", icon: Siren },
      { href: "/admin/deadlines", label: "Дедлайны", icon: CalendarClock },
      { href: "/admin/notifications", label: "Уведомления", icon: Bell },
      { href: "/admin/reports/export", label: "Экспорт отчётов", icon: Download },
      { href: "/admin/database", label: "База данных", icon: Database },
      { href: "/admin/database/analytics", label: "Аналитика БД", icon: Activity },
      { href: "/admin/activity", label: "Журнал действий", icon: ScrollText },
      { href: "/admin/settings", label: "Настройки", icon: Settings },
    ],
  },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      navGroups={navGroups}
      allowedRoles={["ADMIN"]}
      title="Панель администратора"
      titleIcon={Shield}
      activeColor={{
        bg: "bg-amber-100",
        text: "text-amber-800",
        darkBg: "dark:bg-amber-900/30",
        darkText: "dark:text-amber-400",
        icon: "text-amber-600",
      }}
      notifications={<NotificationsBell />}
    >
      {children}
    </DashboardLayout>
  );
}
