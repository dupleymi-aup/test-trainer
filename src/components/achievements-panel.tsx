"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  achievements,
  loadUnlockedAchievements,
  type Achievement,
  type AchievementContext,
} from "@/lib/achievements";

interface AchievementsPanelProps {
  context?: AchievementContext;
}

export function AchievementsPanel({ context }: AchievementsPanelProps) {
  const [unlockedIds, setUnlockedIds] = useState<string[]>(() => loadUnlockedAchievements());
  useEffect(() => {
    const handler = () => {
      setUnlockedIds(loadUnlockedAchievements());
    };
    window.addEventListener("achievements-updated", handler);
    return () => window.removeEventListener("achievements-updated", handler);
  }, []);

  const unlockedCount = unlockedIds.length;
  const totalCount = achievements.length;

  const handleShare = async () => {
    const unlocked = achievements.filter((a) => unlockedIds.includes(a.id));
    const lines = [
      "🏆 Тренажёр тестирования — Мои достижения",
      "",
      `${unlockedCount} из ${totalCount} получено:`,
      ...unlocked.map((a) => `${a.icon} ${a.name} — ${a.description}`),
    ];
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Достижения скопированы в буфер обмена!");
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold flex items-center justify-center gap-2">
              🏅 Достижения
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {unlockedCount} из {totalCount} получено
            </p>
            {unlockedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 mt-2"
                onClick={handleShare}
              >
                <Share2 className="h-3 w-3" />
                Поделиться
              </Button>
            )}
          </div>
          {/* Progress bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%`,
                background: "linear-gradient(to right, #10b981, #059669)",
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {achievements.map((achievement) => {
          const isUnlocked = unlockedIds.includes(achievement.id);
          const progress = context && achievement.progressFn
            ? Math.round(achievement.progressFn(context) * 100)
            : 0;
          return (
            <motion.div
              key={achievement.id}
              whileHover={{ scale: isUnlocked ? 1.02 : 1 }}
              className={`rounded-lg border p-4 transition-all ${
                isUnlocked
                  ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10"
                  : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`text-2xl ${isUnlocked ? "" : "opacity-50 grayscale"}`}>{achievement.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {achievement.name}
                    </p>
                    {isUnlocked && (
                      <Badge className="bg-amber-100 text-amber-800 text-[9px] dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                        ✓
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {achievement.description}
                  </p>
                  {!isUnlocked && progress > 0 && (
                    <div className="mt-2">
                      <Progress value={progress} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">{progress}%</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function AchievementToast({ achievement }: { achievement: Achievement }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 shadow-lg"
    >
      <span className="text-3xl">{achievement.icon}</span>
      <div>
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
          Достижение разблокировано!
        </p>
        <p className="text-sm font-bold">{achievement.name}</p>
      </div>
    </motion.div>
  );
}
