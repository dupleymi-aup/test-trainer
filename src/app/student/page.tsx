"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Beaker,
  Bell,
  BookOpen,
  Trophy,
  TrendingUp,
  Target,
  Clock,
  Award,
  Loader2,
  ArrowRight,
  ChevronRight,
  FileText,
  BarChart3,
  Megaphone,
  Star,
  Medal,
  Mail,
  Settings,
  Map,
  History,
} from "lucide-react";
import { loadProgress, loadAttemptHistory, loadStreak } from "@/lib/storage";
import { tasks } from "@/lib/tasks";
import { logger } from "@/lib/logger";

const TOTAL_TASKS = tasks.length;
const difficultyMap: Record<string, { labelKey: string; color: string; russianValue: string }> = {
  easy: { labelKey: "easy", color: "text-green-600 dark:text-green-400", russianValue: "Легко" },
  medium: { labelKey: "medium", color: "text-amber-600 dark:text-amber-400", russianValue: "Средне" },
  hard: { labelKey: "hard", color: "text-rose-600 dark:text-rose-400", russianValue: "Сложно" },
};

export default function StudentDashboardPage() {
  const t = useTranslations("student");
  const tCommon = useTranslations("common");
  const tStats = useTranslations("stats");
  const locale = useLocale();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<{
    completed: number;
    bestScore: number;
    avgScore: number;
    totalAttempts: number;
    streak: number;
    longestStreak: number;
  } | null>(null);
  const [progress, setProgress] = useState<Record<string, { score: number }>>({});
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
    group: { name: string } | null;
    creator: { name: string | null; role: string };
  }>>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [lastTaskId, setLastTaskId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/student");
      return;
    }
    if (status === "authenticated" && session?.user?.role !== "STUDENT") {
      if (session.user.role === "ADMIN") router.push("/admin/analytics");
      else if (session.user.role === "TEACHER") router.push("/teacher");
      return;
    }
    if (status === "authenticated") {
      const controller = new AbortController();
      const progressData = loadProgress();
      const attempts = loadAttemptHistory();
      const streakData = loadStreak();

      setProgress(progressData);

      const completedTasks = Object.keys(progressData).length;
      const scores = Object.values(progressData).map((p) => p.score);
      const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      setStats({
        completed: completedTasks,
        bestScore,
        avgScore,
        totalAttempts: attempts.length,
        streak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
      });

      // Fetch announcements
      fetch("/api/student/announcements", { signal: controller.signal })
        .then((r) => r.ok ? r.json() : { announcements: [] })
        .then((d) => setAnnouncements(d.announcements || []))
        .catch((e) => { if (controller.signal.aborted) return; logger.warn("Failed to fetch announcements", { error: e }); setAnnouncements([]); });

      // Find last attempted task for "resume" feature
      if (attempts.length > 0) {
        const sortedAttempts = [...attempts].sort((a, b) => b.timestamp - a.timestamp);
        setLastTaskId(sortedAttempts[0].taskId);
      }

      // Fetch unread messages count
      fetch("/api/student/messages?limit=1", { signal: controller.signal })
        .then((r) => r.ok ? r.json() : { unreadCount: 0 })
        .then((d) => setUnreadMessages(d.unreadCount || 0))
        .catch((e) => { if (controller.signal.aborted) return; logger.warn("Failed to fetch unread messages count", { error: e }); });
    }
    return () => {
      if (typeof controller !== "undefined") controller.abort();
    };
  }, [status, session, router]);

  if (status === "loading" || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-muted-foreground">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  const completionPercent = Math.round((stats.completed / TOTAL_TASKS) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
                <Beaker className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {t("greeting", { name: session?.user?.name || t("teacher") })}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t("dashboardSubtitle")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/trainer">
                  {t("goToTrainer")} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {lastTaskId && (
                <Button asChild variant="outline">
                  <Link href={`/trainer?task=${lastTaskId}`}>
                    <Clock className="h-4 w-4 mr-1" /> {t("continue")}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Progress Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">{t("progressTitle")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" /> {t("completed")}
                </div>
                <div className="text-2xl font-bold">{stats.completed} / {TOTAL_TASKS}</div>
                <div className="text-xs text-muted-foreground mt-1">{completionPercent}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-amber-600 dark:text-amber-400" /> {t("bestScore")}
                </div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.bestScore}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-blue-600 dark:text-blue-400" /> {t("avgScore")}
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.avgScore}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {tStats("attempts")}
                </div>
                <div className="text-2xl font-bold">{stats.totalAttempts}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Streak & Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Streak Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-orange-600" />
                {t("streakTitle")}
              </CardTitle>
              <CardDescription>{t("streakSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-600">{stats.streak}</div>
                  <div className="text-sm text-muted-foreground">{t("daysInRow")}</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold">{stats.longestStreak}</div>
                  <div className="text-sm text-muted-foreground">{t("bestStreak")}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("quickActions")}</CardTitle>
              <CardDescription>{t("quickActionsSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/trainer">
                  <span className="flex items-center gap-2">
                    <Beaker className="h-4 w-4" /> {t("openTrainer")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/student/reminders">
                  <span className="flex items-center gap-2">
                    <Bell className="h-4 w-4" /> {t("reminders")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/profile?tab=stats">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> {t("detailedStats")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/student/analytics">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> {t("analytics")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/student/history">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> {t("taskHistory")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/trainer#theory">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> {t("theory")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/student/favorites">
                  <span className="flex items-center gap-2">
                    <Star className="h-4 w-4" /> {t("favorites")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/student/messages">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> {t("messages")}
                    {unreadMessages > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-rose-500 dark:bg-rose-600 rounded-full">{unreadMessages}</span>
                    )}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/student/achievements">
                  <span className="flex items-center gap-2">
                    <Award className="h-4 w-4" /> {t("achievements")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/student/learning-path">
                  <span className="flex items-center gap-2">
                    <Map className="h-4 w-4" /> {t("learningPath")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/student/exams">
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4" /> {t("examHistory")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/student/preferences">
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" /> {t("notificationSettings")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/student/leaderboard">
                  <span className="flex items-center gap-2">
                    <Medal className="h-4 w-4" /> {t("leaderboard")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Task Difficulty Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t("tasksByDifficulty")}</CardTitle>
            <CardDescription>{t("tasksByDifficultySubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(difficultyMap).map(([difficulty, config]) => {
                const tasksByDifficulty = tasks.filter((t) => t.difficulty === config.russianValue);
                const completedByDifficulty = tasksByDifficulty.filter(
                  (t) => progress[String(t.id)]
                ).length;
                const percent = tasksByDifficulty.length > 0
                  ? Math.round((completedByDifficulty / tasksByDifficulty.length) * 100)
                  : 0;

                return (
                  <div key={difficulty}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium ${config.color}`}>{t(config.labelKey)}</span>
                      <span className="text-sm text-muted-foreground">
                        {completedByDifficulty} / {tasksByDifficulty.length}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          difficulty === "easy"
                            ? "bg-green-600"
                            : difficulty === "medium"
                              ? "bg-amber-600"
                              : "bg-rose-600"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Announcements */}
        {announcements.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                {t("announcementsTitle")}
              </CardTitle>
              <CardDescription>{t("announcementsSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {announcements.slice(0, 3).map((ann) => (
                  <div key={ann.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{ann.title}</h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(ann.createdAt).toLocaleDateString(locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "ru-RU")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{ann.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {ann.group && <span>{t("groupLabel")}{ann.group.name}</span>}
                      <span>{t("fromLabel")}{ann.creator.name || t("teacher")}</span>
                    </div>
                  </div>
                ))}
                {announcements.length > 3 && (
                  <p className="text-sm text-center text-muted-foreground">
                    {t("moreAnnouncements", { count: announcements.length - 3 })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming deadlines reminder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              {t("reminders")}
            </CardTitle>
            <CardDescription>{t("remindersSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/student/reminders">
                {t("viewAllReminders")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
