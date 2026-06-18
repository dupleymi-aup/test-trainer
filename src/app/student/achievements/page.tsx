"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Lock } from "lucide-react";

interface AchievementState {
  id: string;
  unlocked: boolean;
  unlockedAt?: number;
}

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const ACHIEVEMENTS_KEY = "test-trainer-achievements";

const achievementDefs: AchievementDef[] = [
  { id: "first_blood", name: "Первый тест", description: "Отправьте первую проверку тест-кейсов", icon: "🎯" },
  { id: "first_perfect", name: "Безупречно", description: "Получите оценку 100% по любому заданию", icon: "⭐" },
  { id: "three_perfect", name: "На отлично", description: "Получите 100% по трём разным заданиям", icon: "🌟" },
  { id: "ten_perfect", name: "Отличник", description: "Получите 100% по десяти разным заданиям", icon: "🎓" },
  { id: "speed_demon", name: "Скоростной", description: "Пройдите задание быстрее чем за 60 секунд с результатом ≥80%", icon: "⚡" },
  { id: "marathon_finisher", name: "Марафонец", description: "Завершите марафон — пройдите все задания подряд", icon: "🏃" },
  { id: "marathon_gold", name: "Золотой марафон", description: "Завершите марафон со средним баллом ≥85%", icon: "🏆" },
  { id: "exam_ace", name: "Экзаменатор", description: "Сдайте экзамен со средним баллом ≥90%", icon: "📋" },
  { id: "hundred_submissions", name: "Сотня", description: "Отправьте 100 проверок тест-кейсов", icon: "💯" },
  { id: "five_hundred", name: "Полтысячи", description: "Отправьте 500 проверок тест-кейсов", icon: "🔥" },
  { id: "ec_master", name: "Мастер ЭК", description: "Достигните 100% покрытия классов эквивалентности", icon: "🧩" },
  { id: "bv_master", name: "Мастер ГЗ", description: "Достигните 100% покрытия граничных значений", icon: "📐" },
  { id: "exception_master", name: "Исключительный", description: "Протестируйте исключения в 5 разных заданиях", icon: "⚠️" },
  { id: "all_categories", name: "Все категории", description: "Используйте все 4 категории тест-кейсов в одной проверке", icon: "🎨" },
  { id: "consistent_learner", name: "Постоянство", description: "Занимайтесь 7 дней подряд", icon: "📅" },
  { id: "long_streak", name: "Дисциплина", description: "Занимайтесь 30 дней подряд", icon: "💪" },
  { id: "theory_explorer", name: "Теоретик", description: "Прочитайте все разделы теории", icon: "📖" },
  { id: "improver", name: "Прогресс", description: "Улучшите свой результат в одном задании 3 раза", icon: "📈" },
  { id: "task_collector", name: "Коллекционер", description: "Попробуйте все 17 заданий", icon: "🎮" },
  { id: "fast_learner", name: "Быстрый старт", description: "Пройдите первые 5 заданий за первый день", icon: "🚀" },
  { id: "night_owl", name: "Полуночник", description: "Практикуйтесь после полуночи", icon: "🦉" },
  { id: "early_bird", name: "Жаворонок", description: "Практикуйтесь до 7 утра", icon: "🌅" },
];

export default function AchievementsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [achievements, setAchievements] = useState<AchievementState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;

    try {
      const stored = localStorage.getItem(ACHIEVEMENTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AchievementState[];
        setAchievements(parsed);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [status, router]);

  const getState = (id: string) => achievements.find((a) => a.id === id);

  if (loading) return <div className="p-8 text-center">Загрузка...</div>;

  const unlocked = achievements.filter((a) => a.unlocked).length;
  const total = achievementDefs.length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/student"><Button variant="ghost" size="icon" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-xl font-bold">Достижения</h1>
        <Badge variant="secondary">{unlocked} / {total}</Badge>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Прогресс</span>
            <span className="text-sm font-bold">{Math.round((unlocked / total) * 100)}%</span>
          </div>
          <Progress value={(unlocked / total) * 100} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {achievementDefs.map((def) => {
          const state = getState(def.id);
          const isUnlocked = state?.unlocked ?? false;
          return (
            <Card key={def.id} className={`transition-all ${isUnlocked ? "border-primary/30 bg-primary/5" : "opacity-50 grayscale"}`}>
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <span className="text-3xl">{def.icon}</span>
                <p className="font-semibold text-sm">{def.name}</p>
                <p className="text-xs text-muted-foreground">{def.description}</p>
                <div className="mt-1">
                  {isUnlocked ? (
                    <Badge variant="default" className="gap-1"><Trophy className="h-3 w-3" /> Открыто</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 opacity-50"><Lock className="h-3 w-3" /> Закрыто</Badge>
                  )}
                </div>
                {isUnlocked && state?.unlockedAt && (
                  <p className="text-[10px] text-muted-foreground">{new Date(state.unlockedAt).toLocaleDateString("ru-RU")}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
