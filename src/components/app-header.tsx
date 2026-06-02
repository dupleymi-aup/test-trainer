"use client";

import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { Beaker, Sun, Moon, HelpCircle, Flame, PlayCircle, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { GlobalNotesDialog } from "@/components/global-notes-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/routing";

const locales = [
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
] as const;

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const currentTheme = theme || "system";

  const themeIcons: Record<string, React.ReactNode> = {
    light: <Sun className="h-4 w-4" />,
    dark: <Moon className="h-4 w-4" />,
    system: <Sun className="h-4 w-4 opacity-50" />,
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(currentTheme === "light" ? "dark" : currentTheme === "dark" ? "system" : "light")}
      aria-label={t("toggleTheme")}
      title={`${t("light")} / ${t("dark")} / ${t("system")}`}
      suppressHydrationWarning
    >
      {themeIcons[currentTheme] || themeIcons.light}
    </Button>
  );
}

function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("header");
  const currentLocale = locales.find((l) => l.code === locale) || locales[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 text-muted-foreground hover:text-foreground"
          aria-label={t("selectLanguage")}
        >
          <Languages className="h-4 w-4" />
          <span className="text-xs hidden sm:inline">{currentLocale.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => router.replace("/", { locale: l.code })}
            className={locale === l.code ? "bg-muted" : ""}
          >
            <span className="mr-2">{l.flag}</span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AppHeaderProps {
  streak: { currentStreak: number };
  onShowShortcuts: () => void;
  onReplayOnboarding: () => void;
  onMarathonClick?: () => void;
}

export function AppHeader({ streak, onShowShortcuts, onReplayOnboarding, onMarathonClick }: AppHeaderProps) {
  const t = useTranslations("header");

  return (
    <header role="banner" className="border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <Beaker className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {t("appTitle")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t("appSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {streak.currentStreak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                  {streak.currentStreak}
                </span>
              </div>
            )}
            {onMarathonClick && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={onMarathonClick}
                aria-label={t("marathonMode")}
                title={t("marathonMode")}
              >
                <Flame className="h-4 w-4 text-orange-500" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={onReplayOnboarding}
              aria-label={t("repeatOnboarding")}
              title={t("repeatOnboarding")}
            >
              <PlayCircle className="h-4 w-4" />
            </Button>
            <GlobalNotesDialog />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground relative"
              onClick={onShowShortcuts}
              aria-label={t("keyboardShortcuts")}
              title={`${t("keyboardShortcuts")} (?)`}
            >
              <HelpCircle className="h-4 w-4" />
              <kbd className="absolute -top-1 -right-1 h-4 w-4 rounded bg-muted text-[8px] font-mono leading-4 text-center text-muted-foreground border hidden sm:block">
                ?
              </kbd>
            </Button>
            <LanguageSwitcher />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
