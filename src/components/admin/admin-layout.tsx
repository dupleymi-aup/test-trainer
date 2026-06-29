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
  FileText,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/dashboard-layout";
import { NotificationsBell } from "@/components/admin/notifications-bell";

interface NavGroup {
  label: string;
  items: Array<{ href: string; label: string; icon: LucideIcon }>;
}

function useNavGroups(): NavGroup[] {
  const t = useTranslations("adminNav");

  return [
    {
      label: t("main"),
      items: [
        { href: "/admin", label: t("dashboard"), icon: LayoutDashboard },
        { href: "/admin/users", label: t("users"), icon: Users },
        { href: "/admin/groups", label: t("groups"), icon: FolderKanban },
      ],
    },
    {
      label: t("analytics"),
      items: [
        { href: "/admin/analytics", label: t("platformOverview"), icon: BarChart3 },
        { href: "/admin/analytics/comprehensive", label: t("comprehensiveAnalytics"), icon: Target },
        { href: "/admin/analytics/predictions", label: t("predictionsRisks"), icon: AlertTriangle },
        { href: "/admin/analytics/at-risk", label: t("atRiskStudents"), icon: AlertTriangle },
        { href: "/admin/analytics/improvement-leaderboard", label: t("improvementLeaders"), icon: Trophy },
        { href: "/admin/analytics/velocity", label: t("learningSpeed"), icon: Zap },
        { href: "/admin/analytics/learning-path", label: t("learningPath"), icon: Route },
        { href: "/admin/analytics/skill-mastery", label: t("skillMastery"), icon: Layers },
      ],
    },
    {
      label: t("comparisonTrends"),
      items: [
        { href: "/admin/analytics/teacher-performance", label: t("teachers"), icon: GraduationCap },
        { href: "/admin/analytics/teacher-comparison", label: t("teacherComparison"), icon: Award },
        { href: "/admin/analytics/university-comparison", label: t("universities"), icon: BookOpen },
        { href: "/admin/analytics/time-trends", label: t("trends"), icon: TrendingUp },
        { href: "/admin/analytics/compare-periods", label: t("periodComparison"), icon: GitCompare },
        { href: "/admin/analytics/group-comparison", label: t("groupComparison"), icon: GitBranch },
        { href: "/admin/analytics/student-comparison", label: t("studentComparison"), icon: Users2 },
      ],
    },
    {
      label: t("ecBvCoverage"),
      items: [
        { href: "/admin/analytics/task-insights", label: t("taskAnalysis"), icon: Activity },
        { href: "/admin/analytics/ec-bv-gaps", label: t("ecBvGapAnalysis"), icon: AlertTriangle },
        { href: "/admin/analytics/ec-bv-heatmap", label: t("ecBvHeatmap"), icon: Crosshair },
        { href: "/admin/analytics/completion-matrix", label: t("completionMatrix"), icon: Table2 },
        { href: "/admin/analytics/group-performance", label: t("groupPerformance"), icon: FolderKanban },
        { href: "/admin/analytics/performance-dashboard", label: t("studentPerformance"), icon: ListFilter },
      ],
    },
    {
      label: t("topicAnalysis"),
      items: [
        { href: "/admin/analytics/topic-breakdown", label: t("topicBreakdown"), icon: Layers },
        { href: "/admin/analytics/topic-heatmap", label: t("topicHeatmap"), icon: Target },
        { href: "/admin/analytics/cohort-retention", label: t("cohortAnalysis"), icon: Calendar },
        { href: "/admin/analytics/time-activity", label: t("timeActivity"), icon: Clock },
      ],
    },
    {
      label: t("advancedAnalytics"),
      items: [
        { href: "/admin/analytics/forecasting", label: t("forecasting"), icon: LineChartIcon },
        { href: "/admin/analytics/anomalies", label: t("anomalies"), icon: Siren },
        { href: "/admin/analytics/recommendations", label: t("recommendations"), icon: Lightbulb },
        { href: "/admin/analytics/student-timeline", label: t("studentTimeline"), icon: TimelineIcon },
        { href: "/admin/analytics/task-detail", label: t("taskDetailAnalysis"), icon: ClipboardList },
        { href: "/admin/analytics/time-score-correlation", label: t("timeScores"), icon: LineChartIcon },
        { href: "/admin/analytics/completion-funnel", label: t("completionFunnel"), icon: ListFilter },
        { href: "/admin/analytics/error-patterns", label: t("commonErrors"), icon: Siren },
        { href: "/admin/analytics/item-difficulty", label: t("taskDifficulty"), icon: Target },
      ],
    },
    {
      label: t("system"),
      items: [
        { href: "/admin/executive", label: t("executive"), icon: FileText },
        { href: "/admin/reports", label: t("reportsHub"), icon: ClipboardList },
        { href: "/admin/alerts", label: t("systemAlerts"), icon: Siren },
        { href: "/admin/deadlines", label: t("deadlines"), icon: CalendarClock },
        { href: "/admin/notifications", label: t("notifications"), icon: Bell },
        { href: "/admin/reports/export", label: t("reportExport"), icon: Download },
        { href: "/admin/database", label: t("database"), icon: Database },
        { href: "/admin/database/analytics", label: t("dbAnalytics"), icon: Activity },
        { href: "/admin/cache", label: t("cache"), icon: Zap },
        { href: "/admin/activity", label: t("activityLog"), icon: ScrollText },
        { href: "/admin/settings", label: t("settings"), icon: Settings },
        { href: "/help", label: t("help"), icon: BookOpen },
      ],
    },
  ];
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("adminNav");
  const navGroups = useNavGroups();

  return (
    <DashboardLayout
      navGroups={navGroups}
      allowedRoles={["ADMIN"]}
      title={t("title")}
      titleIcon={Shield}
      activeColor={{
        bg: "bg-amber-100",
        text: "text-amber-800",
        darkBg: "dark:bg-amber-900/30",
        darkText: "dark:text-amber-400",
        icon: "text-amber-600 dark:text-amber-400",
      }}
      notifications={<NotificationsBell />}
    >
      {children}
    </DashboardLayout>
  );
}
