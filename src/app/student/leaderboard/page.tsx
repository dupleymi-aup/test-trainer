"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Medal, Crown, ArrowLeft, TrendingUp, Target, User } from "lucide-react";
import { logger } from "@/lib/logger";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  avgScore: number;
  bestScore: number;
  totalAttempts: number;
}

type Period = "week" | "month" | "all";

const rankColors: Record<number, string> = {
  1: "text-amber-500",
  2: "text-zinc-500 dark:text-zinc-400",
  3: "text-amber-700 dark:text-amber-500",
};

const rankIcons: Record<number, React.ReactNode> = {
  1: <Crown className="h-5 w-5 text-amber-500" />,
  2: <Medal className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />,
  3: <Medal className="h-5 w-5 text-amber-700 dark:text-amber-500" />,
};

export default function LeaderboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<{ rank: number; stats: LeaderboardEntry } | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [period, setPeriod] = useState<Period>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/student/leaderboard");
      return;
    }
    if (status !== "authenticated") return;

    const controller = new AbortController();
    fetch(`/api/student/leaderboard?period=${period}&limit=30`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data) => {
        setLeaderboard(data.leaderboard);
        setCurrentUser(data.currentUser);
        setTotalParticipants(data.totalParticipants);
      })
      .catch((e) => { logger.warn("Failed to load leaderboard", { error: e }); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [status, router, period]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild aria-label="Назад">
              <Link href="/student"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-500" />
              <h1 className="text-xl font-bold">Таблица лидеров</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Period selector */}
        <div className="flex gap-2 mb-6">
          {([
            { key: "week" as Period, label: "Неделя" },
            { key: "month" as Period, label: "Месяц" },
            { key: "all" as Period, label: "Всё время" },
          ]).map((p) => (
            <Button
              key={p.key}
              variant={period === p.key ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* My position card */}
        {currentUser && (
          <Card className="mb-6 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900">
                  <User className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Моё место</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>#{currentUser.rank} из {totalParticipants}</span>
                    <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {currentUser.stats.avgScore}%</span>
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {currentUser.stats.totalAttempts} попыток</span>
                  </div>
                </div>
                <Badge variant="default" className="text-lg px-3 py-1">
                  #{currentUser.rank}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Рейтинг студентов
            </CardTitle>
            <CardDescription>
              Всего участников: {totalParticipants}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors ${
                    entry.userId === session?.user?.id ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""
                  }`}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted font-bold text-sm">
                    {entry.rank <= 3 ? (
                      <span className={rankColors[entry.rank]}>{rankIcons[entry.rank]}</span>
                    ) : (
                      <span className="text-muted-foreground">{entry.rank}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted">
                      <span className="text-sm font-medium">
                        {(entry.name || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {entry.userId === session?.user?.id ? "Вы" : entry.name || "Аноним"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.totalAttempts} попыток
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-sm">{entry.avgScore}%</p>
                      <p className="text-xs text-muted-foreground">средний</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-amber-600 dark:text-amber-400">{entry.bestScore}%</p>
                      <p className="text-xs text-muted-foreground">лучший</p>
                    </div>
                  </div>
                </div>
              ))}

              {leaderboard.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Нет данных за выбранный период</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
