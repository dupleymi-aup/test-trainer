"use client";

import { useTheme } from "next-themes";
import { Beaker, Sun, Moon, HelpCircle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

interface AppHeaderProps {
  streak: { currentStreak: number };
  onShowShortcuts: () => void;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      suppressHydrationWarning
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function AppHeader({ streak, onShowShortcuts }: AppHeaderProps) {
  return (
    <header className="border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <Beaker className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Тренажёр тестирования
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Генератор тест-кейсов • Методы чёрного ящика
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {streak.currentStreak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 mr-1">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                  {streak.currentStreak}
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={onShowShortcuts}
              title="Горячие клавиши"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
