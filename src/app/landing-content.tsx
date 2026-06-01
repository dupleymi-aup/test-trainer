"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Beaker,
  Sun,
  Moon,
  Shield,
  Target,
  Layers,
  GitBranch,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TOTAL_TASKS = 30;

const demoTask = {
  name: "Факториал",
  difficulty: "Легко" as const,
  description: "Напишите функцию, которая вычисляет факториал неотрицательного целого числа. Вход: число n ≥ 0. Выход: n! (произведение всех чисел от 1 до n).",
  topics: ["Валидация входных данных", "Граничные значения"],
  params: [{ name: "n", type: "number", description: "Неотрицательное целое число" }],
  returnType: "number",
};

const methods = [
  { icon: Target, title: "Классы эквивалентности" },
  { icon: Shield, title: "Граничные значения" },
  { icon: Layers, title: "Комбинаторное тестирование" },
  { icon: GitBranch, title: "Таблица решений" },
  { icon: BookOpen, title: "Тестирование переходов состояний" },
  { icon: TrendingUp, title: "Попарное тестирование" },
];

const difficultyColor = (difficulty: string) =>
  difficulty === "Легко"
    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : difficulty === "Средне"
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
      suppressHydrationWarning
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function Header({ isAuthenticated, userRole }: { isAuthenticated: boolean; userRole: string | null }) {
  const roleLink = userRole === "TEACHER"
    ? "/teacher"
    : userRole === "ADMIN"
      ? "/admin"
      : "/student";

  const roleLabel = userRole === "TEACHER"
    ? "Панель преподавателя"
    : userRole === "ADMIN"
      ? "Панель администратора"
      : "Мой кабинет";

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

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <Button asChild variant="ghost">
                  <Link href={roleLink}>{roleLabel}</Link>
                </Button>
                <Button asChild variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/trainer">
                    Тренажёр <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Войти</Link>
                </Button>
                <Button asChild variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/register">Регистрация</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function UserCountStats() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setCount(data.userCount))
      .catch(() => {});
  }, []);

  if (count == null) return null;

  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 text-sm">
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{count.toLocaleString("ru-RU")}</span>
        <span className="text-muted-foreground">пользователей уже учатся</span>
      </div>
    </div>
  );
}

export function LandingContent({ isAuthenticated, userRole }: { isAuthenticated: boolean; userRole: string | null }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/20">
      <Header isAuthenticated={isAuthenticated} userRole={userRole} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <Badge variant="outline" className="mb-4 text-sm px-4 py-1.5">
              Методы тестирования чёрного ящика
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-6">
              Научитесь писать качественные тест-кейсы
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Интерактивный тренажёр для отработки навыков тест-дизайна.
              Практикуйте классы эквивалентности, граничные значения, таблицы решений
              и другие методы на реальных задачах.
            </p>
            <div className="mb-6">
              <UserCountStats />
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {isAuthenticated ? (
                <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-base px-8">
                  <Link href="/trainer">
                    Перейти к тренажёру <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-base px-8">
                    <Link href="/register">Начать обучение</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-base px-8">
                    <Link href="/login">Войти</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* What You'll Learn Section */}
        <section className="py-16 bg-white/50 dark:bg-zinc-900/50">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                Чему вы научитесь
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Освойте основные техники тест-дизайна, используемые профессиональными QA-инженерами
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {methods.map((method) => (
                <div key={method.title} className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-zinc-900 border shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <method.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{method.title}</h4>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Зарегистрируйтесь, чтобы изучить каждый метод с примерами и практикой
            </p>
          </div>
        </section>

        {/* Demo Task Section */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-8">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                Попробуйте сами
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Вот как выглядит типичная задача — попробуйте придумать тест-кейсы
              </p>
            </div>
            <div className="rounded-xl border bg-white dark:bg-zinc-900 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-lg font-semibold">{demoTask.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={difficultyColor(demoTask.difficulty)}>{demoTask.difficulty}</Badge>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">Демо</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{demoTask.description}</p>
              <div className="rounded-lg bg-muted/50 p-4 text-sm font-mono">
                <div className="text-muted-foreground mb-1">// Сигнатура функции</div>
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400">function</span> {demoTask.name.toLowerCase()}
                  (<span className="text-blue-600 dark:text-blue-400">{demoTask.params[0].name}</span>: <span className="text-yellow-600 dark:text-yellow-400">{demoTask.params[0].type}</span>): <span className="text-yellow-600 dark:text-yellow-400">{demoTask.returnType}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {demoTask.topics.map((topic) => (
                  <Badge key={topic} variant="outline" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Зарегистрируйтесь, чтобы увидеть классы эквивалентности, граничные значения и проверить свои тест-кейсы
                </p>
                <Button asChild variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/register">Начать бесплатно</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 bg-white/50 dark:bg-zinc-900/50">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                Как это работает
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Три простых шага к освоению тест-дизайна
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white text-lg font-bold mx-auto mb-4">
                  1
                </div>
                <h4 className="text-lg font-semibold mb-2">Регистрация</h4>
                <p className="text-sm text-muted-foreground">
                  Создайте аккаунт за 30 секунд — email или телефон
                </p>
              </div>
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white text-lg font-bold mx-auto mb-4">
                  2
                </div>
                <h4 className="text-lg font-semibold mb-2">Выберите задачу</h4>
                <p className="text-sm text-muted-foreground">
                  От простых функций до бизнес-сценариев — от легкого к сложному
                </p>
              </div>
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white text-lg font-bold mx-auto mb-4">
                  3
                </div>
                <h4 className="text-lg font-semibold mb-2">Практика</h4>
                <p className="text-sm text-muted-foreground">
                  Пишите тест-кейсы и получайте мгновенную оценку покрытия
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                Возможности платформы
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <h4 className="text-lg font-semibold mb-2">Автоматическая проверка</h4>
                <p className="text-sm text-muted-foreground">
                  Мгновенная оценка ваших тест-кейсов — покрытие классов эквивалентности и граничных значений
                </p>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <TrendingUp className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <h4 className="text-lg font-semibold mb-2">Отслеживание прогресса</h4>
                <p className="text-sm text-muted-foreground">
                  Статистика, динамика результатов, карта навыков — отслеживайте свой рост
                </p>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <Award className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <h4 className="text-lg font-semibold mb-2">Геймификация</h4>
                <p className="text-sm text-muted-foreground">
                  Достижения, серии, рейтинги — учитесь увлекательно
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {isAuthenticated ? (
          <section className="py-16">
            <div className="max-w-3xl mx-auto px-4 text-center">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                {userRole === "TEACHER"
                  ? "Панель преподавателя"
                  : userRole === "ADMIN"
                    ? "Панель администратора"
                    : "Продолжайте обучение"}
              </h3>
              <p className="text-muted-foreground mb-8">
                {userRole === "TEACHER"
                  ? "Управляйте группами, создавайте задания и отслеживайте прогресс студентов"
                  : userRole === "ADMIN"
                    ? "Управляйте пользователями, аналитикой и настройками платформы"
                    : "Перейдите в личный кабинет или откройте тренажёр для практики"}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button asChild size="lg" variant="outline" className="text-base px-8">
                  <Link href={userRole === "TEACHER" ? "/teacher" : userRole === "ADMIN" ? "/admin" : "/student"}>
                    {userRole === "TEACHER"
                      ? "Панель преподавателя"
                      : userRole === "ADMIN"
                        ? "Панель администратора"
                        : "Мой кабинет"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-base px-8">
                  <Link href="/trainer">
                    Тренажёр <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <section className="py-16">
            <div className="max-w-3xl mx-auto px-4 text-center">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                Готовы начать?
              </h3>
              <p className="text-muted-foreground mb-8">
                Зарегистрируйтесь бесплатно и получите доступ ко всем {TOTAL_TASKS} задачам,
                подробной теории, отслеживанию прогресса и персональной статистике
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-base px-8">
                  <Link href="/register">Зарегистрироваться</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-base px-8">
                  <Link href="/login">Войти в аккаунт</Link>
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t bg-white/50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          Тренажёр тестирования • Генератор тест-кейсов • Методы чёрного ящика
        </div>
      </footer>
    </div>
  );
}
