"use client";

import { motion } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Task } from "@/lib/tasks";
import { markTheorySectionViewed, loadTheorySectionsViewed } from "@/lib/storage";
import { WorkedExampleViewer } from "@/components/worked-example";
import {
  BookOpen,
  Layers,
  GitBranch,
  ArrowRightLeft,
  Lightbulb,
  ShieldCheck,
  LayoutGrid,
  ArrowLeftRight,
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  TestTube,
  Target,
} from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

interface TheorySection {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  openBorder: string;
  content: React.ReactNode;
}

function TheorySectionCard({
  section,
  isExpanded,
  isViewed,
  isRecommended,
  onToggle,
}: {
  section: TheorySection;
  isExpanded: boolean;
  isViewed: boolean;
  isRecommended: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`border rounded-lg transition-all duration-200 ${
        isExpanded ? section.openBorder : "hover:shadow-md"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${section.iconBg}`}>
          {section.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm flex items-center gap-1.5 flex-wrap">
            {section.title}
            {isViewed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />}
            {isRecommended && (
              <Badge variant="default" className="text-[9px] px-1 py-0 h-4 bg-emerald-600 hover:bg-emerald-700">
                Рекомендуется
              </Badge>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">{section.subtitle}</p>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          {section.content}
        </div>
      )}
    </div>
  );
}

export function TheoryPanel({ task }: { task?: Task }) {
  const [viewedSections, setViewedSections] = useState<Set<string>>(() => new Set(loadTheorySectionsViewed()));

  // Compute relevant sections based on current task topics
  const relevantSections = useMemo(() => {
    if (!task) return [];
    const sections: string[] = [];
    const topics = task.topics.map((t) => t.toLowerCase());
    if (topics.some((t) => t.includes("класс") || t.includes("equivalence"))) sections.push("ec");
    if (topics.some((t) => t.includes("гранич") || t.includes("boundary"))) sections.push("bv");
    if (topics.some((t) => t.includes("многофактор") || t.includes("комбинатор") || t.includes("pairwise"))) {
      sections.push("pairwise");
      sections.push("decision-tables");
    }
    if (topics.some((t) => t.includes("логическ") || t.includes("decision") || t.includes("condition"))) sections.push("decision-tables");
    if (topics.some((t) => t.includes("состоя") || t.includes("transition") || t.includes("переход"))) sections.push("state-transition");
    if (topics.some((t) => t.includes("формат") || t.includes("валид") || t.includes("проверк"))) {
      sections.push("error-guessing");
      sections.push("exploratory");
    }
    if (topics.some((t) => t.includes("рекурс") || t.includes("recursion"))) sections.push("testing-strategy");
    if (topics.some((t) => t.includes("комбинатор") || t.includes("многофактор"))) sections.push("test-design");
    // Always include categories and tips as defaults
    if (sections.length < 2) sections.push("categories", "tips");
    return [...new Set(sections)];
  }, [task]);

  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(relevantSections.length > 0 ? relevantSections : []));

  const isRecommended = (section: string) => task && relevantSections.includes(section);

  const handleSectionToggle = useCallback((sectionId: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else {
        next.add(sectionId);
        markTheorySectionViewed(sectionId);
        setViewedSections((v) => new Set(v).add(sectionId));
      }
      return next;
    });
  }, []);

  const theoryProgress = useMemo(() => {
    const totalSections = 14;
    return { viewed: viewedSections.size, total: totalSections };
  }, [viewedSections]);

  const sections: TheorySection[] = [
    {
      id: "ec",
      icon: <Layers className="h-4 w-4" />,
      iconBg: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400",
      title: "Классы эквивалентности",
      subtitle: "Разделение входных данных на группы",
      openBorder: "data-[state=open]:border-emerald-300 data-[state=open]:bg-emerald-50/50 dark:data-[state=open]:border-emerald-800 dark:data-[state=open]:bg-emerald-950/20",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong>Классы эквивалентности</strong> — это метод тестирования, при котором
            входные данные разбиваются на группы (классы), внутри которых поведение
            функции одинаковое. Достаточно протестировать одно значение из каждого класса.
          </p>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider">Типы классов</p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 dark:text-emerald-400 mt-0.5">●</span>
                <span><strong>Валидные классы</strong> — допустимые входные данные, для которых функция должна работать корректно</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 mt-0.5">●</span>
                <span><strong>Невалидные классы</strong> — недопустимые данные, которые должны вызывать ошибку или исключение</span>
              </li>
            </ul>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
            <p className="font-medium text-emerald-800 dark:text-emerald-300 text-xs mb-1 flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" /> Пример
            </p>
            <p className="text-xs">
              Для функции <code className="font-mono bg-muted px-1 rounded">factorial(n)</code> с условием 0 ≤ n ≤ 20:
            </p>
            <ul className="mt-1 space-y-0.5 text-xs">
              <li>• n = 0 → отдельный класс (граничный)</li>
              <li>• 1 ≤ n ≤ 20 → нормальные значения</li>
              <li>• n &lt; 0 → ошибка</li>
              <li>• n &gt; 20 → переполнение</li>
              <li>• n — не целое число → ошибка типа</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "bv",
      icon: <GitBranch className="h-4 w-4" />,
      iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
      title: "Граничные значения",
      subtitle: "Тестирование на границах диапазонов",
      openBorder: "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong>Анализ граничных значений</strong> — это метод, основанный на том, что
            ошибки чаще всего возникают на границах диапазонов допустимых значений.
            Для каждого диапазона тестируются значения на границах и рядом с ними.
          </p>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider">Правила выбора граничных значений</p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">●</span>
                <span>Минимальное и максимальное допустимое значение</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">●</span>
                <span>Значение «чуть ниже» минимума и «чуть выше» максимума</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">●</span>
                <span>Особые точки: ноль, пустая строка, null</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">●</span>
                <span>Точки перехода между логическими условиями</span>
              </li>
            </ul>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            <p className="font-medium text-amber-800 dark:text-amber-300 text-xs mb-1 flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" /> Пример
            </p>
            <p className="text-xs">Для диапазона 1 ≤ n ≤ 10:</p>
            <div className="flex gap-2 mt-1 text-xs flex-wrap">
              <code className="bg-white dark:bg-muted px-1.5 py-0.5 rounded font-mono border border-rose-200 dark:border-rose-800 text-rose-700">0 (недо)</code>
              <code className="bg-white dark:bg-muted px-1.5 py-0.5 rounded font-mono border border-emerald-200 dark:border-emerald-800 text-emerald-700">1 (min)</code>
              <code className="bg-white dark:bg-muted px-1.5 py-0.5 rounded font-mono border border-emerald-200 dark:border-emerald-800 text-emerald-700">2 (min+1)</code>
              <code className="bg-white dark:bg-muted px-1.5 py-0.5 rounded font-mono border border-emerald-200 dark:border-emerald-800 text-emerald-700">9 (max-1)</code>
              <code className="bg-white dark:bg-muted px-1.5 py-0.5 rounded font-mono border border-emerald-200 dark:border-emerald-800 text-emerald-700">10 (max)</code>
              <code className="bg-white dark:bg-muted px-1.5 py-0.5 rounded font-mono border border-rose-200 dark:border-rose-800 text-rose-700">11 (сверх)</code>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "categories",
      icon: <ArrowRightLeft className="h-4 w-4" />,
      iconBg: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
      title: "Категории тест-кейсов",
      subtitle: "Как классифицировать тесты",
      openBorder: "border-purple-300 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
              <p className="font-medium text-emerald-800 dark:text-emerald-300 text-xs mb-1">🟢 Нормальное значение</p>
              <p className="text-xs">Обычные входные данные, находящиеся в допустимом диапазоне. Функция должна корректно обработать и вернуть ожидаемый результат.</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <p className="font-medium text-amber-800 dark:text-amber-300 text-xs mb-1">🟡 Граничное значение</p>
              <p className="text-xs">Значения на границах диапазонов: минимум, максимум, переходные точки. Здесь наиболее вероятны ошибки.</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3">
              <p className="font-medium text-rose-800 dark:text-rose-300 text-xs mb-1">🔴 Исключение</p>
              <p className="text-xs">Входные данные, которые вызывают ошибку или исключение. Проверяется корректная обработка неверных данных.</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <p className="font-medium text-purple-800 dark:text-purple-300 text-xs mb-1">🟣 Недопустимый тип</p>
              <p className="text-xs">Данные неверного типа: строка вместо числа, null вместо объекта и т.д. Проверяется валидация входных данных.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "tips",
      icon: <ShieldCheck className="h-4 w-4" />,
      iconBg: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400",
      title: "Советы",
      subtitle: "Лучшие практики тестирования",
      openBorder: "border-teal-300 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-950/20",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0">1.</span>
              <span><strong>Покройте все классы эквивалентности</strong> — для каждого класса создайте хотя бы один тест-кейс</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0">2.</span>
              <span><strong>Не забывайте о граничных значениях</strong> — тестируйте границы и значения рядом с ними</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0">3.</span>
              <span><strong>Тестируйте невалидные данные</strong> — проверьте, как функция обрабатывает ошибки</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0">4.</span>
              <span><strong>Проверяйте типы</strong> — передайте данные неверного типа и убедитесь, что функция корректно обработает это</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0">5.</span>
              <span><strong>Используйте осмысленные комментарии</strong> — записывайте, почему выбран конкретный тест-кейс</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0">6.</span>
              <span><strong>Начинайте с «happy path»</strong> — сначала протестируйте основной сценарий, потом крайние случаи</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0">7.</span>
              <span><strong>Один тест — одна цель</strong> — не проверяйте несколько независимых условий в одном тест-кейсе</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0">8.</span>
              <span><strong>Документируйте ожидаемый результат</strong> — ожидаемый результат должен быть понятен без запуска кода</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0">9.</span>
              <span><strong>Думайте как пользователь</strong> — какие данные введёт реальный пользователь, а не только «правильные»</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0">10.</span>
              <span><strong>После формальных методов добавьте Error Guessing</strong> — проверьте пробелы, эмодзи, очень длинные строки</span>
            </li>
          </ul>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
            <p className="font-medium text-emerald-800 dark:text-emerald-300 text-xs mb-1 flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" /> Пример из практики
            </p>
            <p className="text-xs mb-1">
              <strong>Баг в продакшене:</strong> форма регистрации принимала email «test@.com» как валидный.
            </p>
            <p className="text-xs mb-1">
              <strong>Причина:</strong> не была проверена граничная длина домена (минимум 2 символа до точки).
            </p>
            <p className="text-xs">
              <strong>Урок:</strong> всегда проверяйте все части составных данных, а не только формат целиком.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "state-transition",
      icon: <ArrowLeftRight className="h-4 w-4" />,
      iconBg: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400",
      title: "Диаграммы состояний",
      subtitle: "Тестирование переходов между состояниями",
      openBorder: "border-cyan-300 bg-cyan-50/50 dark:border-cyan-800 dark:bg-cyan-950/20",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong>Тестирование переходов состояний</strong> — это метод, при котором
            тестируются переходы системы из одного состояния в другое под воздействием
            различных событий. Особенно полезен для функций с памятью или состоянием.
          </p>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider">Основные понятия</p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 mt-0.5 shrink-0">●</span>
                <span><strong>Состояние</strong> — текущее условие системы (например, «авторизован», «не авторизован»)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 mt-0.5 shrink-0">●</span>
                <span><strong>Переход</strong> — изменение состояния при определённом событии</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 mt-0.5 shrink-0">●</span>
                <span><strong>Событие</strong> — действие, вызывающее переход (клик, ввод данных)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 mt-0.5 shrink-0">●</span>
                <span><strong>Недопустимый переход</strong> — переход, который система не должна разрешать</span>
              </li>
            </ul>
          </div>
          <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3">
            <p className="font-medium text-cyan-800 dark:text-cyan-300 text-xs mb-1 flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" /> Пример: Банкомат
            </p>
            <p className="text-xs">
              Состояния: «Карта вставлена», «PIN введён», «Ошибка».
              Переходы: вставка карты → ввод PIN → правильный/неправильный PIN.
              Тест-кейсы: все допустимые пути + попытка снять деньги без ввода PIN.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider">Покрытие переходов</p>
            <ul className="space-y-1.5 text-xs">
              <li>• <strong>0-switch coverage</strong> — тестирование каждого отдельного перехода</li>
              <li>• <strong>1-switch coverage</strong> — тестирование последовательностей из двух переходов</li>
              <li>• <strong>N-switch coverage</strong> — тестирование цепочек из N+1 переходов</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "decision-tables",
      icon: <LayoutGrid className="h-4 w-4" />,
      iconBg: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
      title: "Таблицы решений",
      subtitle: "Систематический подход к логическим условиям",
      openBorder: "border-orange-300 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong>Таблица решений</strong> — это метод, который систематизирует все комбинации
            логических условий и определяет ожидаемый результат для каждой комбинации. Это особенно
            полезно когда функция содержит сложные условные конструкции с несколькими ветвями.
          </p>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider">Шаги создания таблицы решений</p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5 shrink-0">1.</span>
                <span>Определите все условия (логические выражения) и их возможные значения (истина/ложь)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5 shrink-0">2.</span>
                <span>Составьте все возможные комбинации значений условий</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5 shrink-0">3.</span>
                <span>Для каждой комбинации определите ожидаемое действие или результат</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5 shrink-0">4.</span>
                <span>Создайте тест-кейс для каждой уникальной комбинации</span>
              </li>
            </ul>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
            <p className="font-medium text-orange-800 dark:text-orange-300 text-xs mb-1 flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" /> Пример: Високосный год
            </p>
            <p className="text-xs mb-2">Для isLeapYear(year) условия: year%4==0, year%100==0, year%400==0.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="bg-orange-100 dark:bg-orange-900/40">
                    <th className="border border-orange-300 dark:border-orange-700 px-1.5 py-1">#</th>
                    <th className="border border-orange-300 dark:border-orange-700 px-1.5 py-1">÷400</th>
                    <th className="border border-orange-300 dark:border-orange-700 px-1.5 py-1">÷100</th>
                    <th className="border border-orange-300 dark:border-orange-700 px-1.5 py-1">÷4</th>
                    <th className="border border-orange-300 dark:border-orange-700 px-1.5 py-1">Результат</th>
                    <th className="border border-orange-300 dark:border-orange-700 px-1.5 py-1">Пример</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center">1</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center text-emerald-600">Да</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center text-emerald-600">Да</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center text-emerald-600">Да</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-emerald-700 font-semibold">Високосный</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center">2000</td></tr>
                  <tr><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center">2</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center text-rose-600">Нет</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center text-emerald-600">Да</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center text-emerald-600">Да</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-rose-700 font-semibold">Не високосный</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center">1900</td></tr>
                  <tr><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center">3</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center text-rose-600">—</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center text-rose-600">Нет</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center text-emerald-600">Да</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-emerald-700 font-semibold">Високосный</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center">2024</td></tr>
                  <tr><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center">4</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center text-rose-600">—</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center text-rose-600">—</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center text-rose-600">Нет</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-rose-700 font-semibold">Не високосный</td><td className="border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 text-center">2023</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-2 text-muted-foreground">
              Знак «—» означает, что значение условия не влияет на результат. Вместо 8 комбинаций достаточно 4 теста.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "pairwise",
      icon: <ArrowLeftRight className="h-4 w-4" />,
      iconBg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
      title: "Попарное тестирование",
      subtitle: "Сокращение комбинаций с гарантированным покрытием пар",
      openBorder: "border-indigo-300 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/20",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong>Попарное тестирование (Pairwise Testing)</strong> — это техника создания тест-кейсов,
            при которой каждая пара параметров тестируется во всех возможных комбинациях значений.
            Это позволяет существенно сократить количество тестов по сравнению с полным перебором.
          </p>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider">Когда использовать</p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5 shrink-0">●</span>
                <span>Функция принимает 3 и более параметров</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5 shrink-0">●</span>
                <span>Каждый параметр имеет несколько классов эквивалентности</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5 shrink-0">●</span>
                <span>Полный перебор всех комбинаций слишком дорог (экспоненциальный рост)</span>
              </li>
            </ul>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
            <p className="font-medium text-indigo-800 dark:text-indigo-300 text-xs mb-1 flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" /> Пример
            </p>
            <p className="text-xs">
              Функция с 3 параметрами, каждый с 3 значениями: 3×3×3 = 27 комбинаций.
              Попарное покрытие гарантирует, что каждая пара значений появится хотя бы раз —
              это требует всего 9 тестов вместо 27.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider">Популярные инструменты</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>PICT</strong> (Microsoft) — генератор попарных тестов</li>
              <li>• <strong>AllPairs</strong> — онлайн-генератор</li>
              <li>• <strong>Pairwise Wizard</strong> — визуальный инструмент</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "metrics",
      icon: <BarChart3 className="h-4 w-4" />,
      iconBg: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
      title: "Метрики покрытия",
      subtitle: "Как оценивается качество тестирования",
      openBorder: "border-violet-300 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            В этом тренажёре оценка качества тестирования основана на трёх ключевых метриках.
            Каждая метрика измеряет отдельный аспект полноты тестирования.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
              <p className="font-medium text-emerald-800 dark:text-emerald-300 text-xs mb-1">📊 Покрытие EC (40%)</p>
              <p className="text-xs">Какая доля определённых классов эквивалентности покрыта вашими тестами.</p>
              <p className="text-xs mt-1 font-mono bg-white/50 dark:bg-black/20 rounded p-1">EC = покрытые / всего × 100%</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <p className="font-medium text-amber-800 dark:text-amber-300 text-xs mb-1">📏 Покрытие BV (30%)</p>
              <p className="text-xs">Какая доля определённых граничных значений протестирована.</p>
              <p className="text-xs mt-1 font-mono bg-white/50 dark:bg-black/20 rounded p-1">BV = покрытые / всего × 100%</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="font-medium text-blue-800 dark:text-blue-300 text-xs mb-1">✅ Корректность (30%)</p>
              <p className="text-xs">Какая доля ожидаемых результатов совпала с фактическим поведением.</p>
              <p className="text-xs mt-1 font-mono bg-white/50 dark:bg-black/20 rounded p-1">Correctness = правильные / всего × 100%</p>
            </div>
          </div>
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3">
            <p className="font-medium text-violet-800 dark:text-violet-300 text-xs mb-1 flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" /> Итоговая формула
            </p>
            <p className="text-xs font-mono bg-white/50 dark:bg-black/20 rounded p-1.5 mt-1">
              Overall = EC×0.4 + BV×0.3 + Correctness×0.3
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider mb-2">Градации оценок</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span><strong>90-100%</strong> — Отлично</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span><strong>75-89%</strong> — Хорошо</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span><span><strong>50-74%</strong> — Удовл.</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span><strong>0-49%</strong> — Неудовл.</span></div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "error-guessing",
      icon: <ShieldCheck className="h-4 w-4" />,
      iconBg: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
      title: "Предугадывание ошибок",
      subtitle: "Интуитивный поиск типичных дефектов",
      openBorder: "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong>Error Guessing</strong> — это техника тестирования, основанная на опыте,
            интуиции и знании типичных ошибок.
          </p>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider">Типичные «горячие точки»</p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5 shrink-0">●</span>
                <span>Нулевые и пустые значения (<code className="font-mono bg-muted px-1 rounded">null</code>, <code className="font-mono bg-muted px-1 rounded">""</code>, <code className="font-mono bg-muted px-1 rounded">0</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5 shrink-0">●</span>
                <span>Пустые коллекции и массивы</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5 shrink-0">●</span>
                <span>Очень большие значения (переполнение, длинные строки)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5 shrink-0">●</span>
                <span>Специальные символы (<code className="font-mono bg-muted px-1 rounded">'</code>, <code className="font-mono bg-muted px-1 rounded">"</code>, <code className="font-mono bg-muted px-1 rounded">&lt;&gt;</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5 shrink-0">●</span>
                <span>Юникод и разные языки (кириллица, эмодзи)</span>
              </li>
            </ul>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1 flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" /> Примеры «хитрых» тестов
            </p>
            <ul className="text-xs space-y-1">
              <li>• Строка из пробелов: <code className="font-mono bg-muted px-1 rounded">"   "</code></li>
              <li>• Отрицательный ноль: <code className="font-mono bg-muted px-1 rounded">-0</code></li>
              <li>• Очень длинная строка: <code className="font-mono bg-muted px-1 rounded">"a".repeat(10000)</code></li>
              <li>• Эмодзи: <code className="font-mono bg-muted px-1 rounded">"🔥🎉"</code></li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "common-mistakes",
      icon: <AlertTriangle className="h-4 w-4" />,
      iconBg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
      title: "Типичные ошибки студентов",
      subtitle: "Чего следует избегать при написании тестов",
      openBorder: "border-yellow-300 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">❌ Дублирование тестов</p>
              <p className="text-xs">Добавление нескольких тестов из одного класса не увеличивает покрытие.</p>
              <p className="text-xs mt-1 font-mono bg-white/50 dark:bg-black/20 rounded px-1.5 py-1"><span className="text-rose-600">Плохо:</span> factorial(5), factorial(7), factorial(10)</p>
              <p className="text-xs mt-0.5 font-mono bg-white/50 dark:bg-black/20 rounded px-1.5 py-1"><span className="text-emerald-600">Хорошо:</span> factorial(5) — один тест</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">❌ Игнорирование невалидных данных</p>
              <p className="text-xs">Обработка ошибок — важная часть покрытия. Не забывайте про исключения.</p>
              <p className="text-xs mt-1 font-mono bg-white/50 dark:bg-black/20 rounded px-1.5 py-1"><span className="text-rose-600">Пропуск:</span> triangleType(3,4,5) ✓ но нет triangleType(-1,2,3)</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">❌ Неправильный ожидаемый результат</p>
              <p className="text-xs">Ожидаемый результат должен соответствовать реальному поведению функции.</p>
              <p className="text-xs mt-1 font-mono bg-white/50 dark:bg-black/20 rounded px-1.5 py-1"><span className="text-rose-600">Ошибка:</span> validateEmail("a@b.c") → valid=true</p>
              <p className="text-xs mt-0.5 font-mono bg-white/50 dark:bg-black/20 rounded px-1.5 py-1"><span className="text-emerald-600">Реальность:</span> valid=false</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">❌ Пропуск граничных значений</p>
              <p className="text-xs">Границы — отдельный метод от классов эквивалентности.</p>
              <p className="text-xs mt-1 font-mono bg-white/50 dark:bg-black/20 rounded px-1.5 py-1"><span className="text-rose-600">Пропуск:</span> isPrime(5), isPrime(7) — но нет isPrime(2)</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">❌ Пустые комментарии</p>
              <p className="text-xs">«Тест для EC1» — плохой комментарий; «Граничное значение: n=0» — хороший.</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">❌ Тестирование только одного нарушения</p>
              <p className="text-xs">Проверяйте комбинированные нарушения в функциях с множественными проверками.</p>
              <p className="text-xs mt-1 font-mono bg-white/50 dark:bg-black/20 rounded px-1.5 py-1"><span className="text-rose-600">Пример:</span> validatePassword("abc") нарушает 4 правила сразу</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">❌ Проверка только «happy path»</p>
              <p className="text-xs">Тестирование только позитивных сценариев пропускает 50% покрытия — обработку ошибок.</p>
              <p className="text-xs mt-1 font-mono bg-white/50 dark:bg-black/20 rounded px-1.5 py-1"><span className="text-rose-600">Пропуск:</span> parseNumber("123") ✓ но нет parseNumber("abc")</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">❌ Игнорирование типов данных</p>
              <p className="text-xs">Функция может принимать null, undefined, строку вместо числа — это отдельные классы.</p>
              <p className="text-xs mt-1 font-mono bg-white/50 dark:bg-black/20 rounded px-1.5 py-1"><span className="text-rose-600">Пропуск:</span> calculateBMI(70, 1.75) ✓ но нет calculateBMI(null, 1.75)</p>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border-l-4 border-yellow-500">
            <p className="font-medium text-yellow-800 dark:text-yellow-300 text-xs mb-1 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Реальный кейс
            </p>
            <p className="text-xs mb-1">
              <strong>Проблема:</strong> система блокировала аккаунты пользователей после 3 неверных попыток входа, 
              но счётчик не сбрасывался после успешного входа.
            </p>
            <p className="text-xs mb-1">
              <strong>Причина:</strong> тестировщики проверяли сценарий «3 неправильных пароля», но не проверили 
              «2 неправильных → 1 правильный → 2 неправильных».
            </p>
            <p className="text-xs">
              <strong>Урок:</strong> тестируйте не только отдельные переходы, но и их комбинации и сброс состояний.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "testing-strategy",
      icon: <Brain className="h-4 w-4" />,
      iconBg: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
      title: "Алгоритм создания тестов",
      subtitle: "Пошаговая стратегия для любой функции",
      openBorder: "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>Следуйте этому алгоритму для систематического создания тест-кейсов.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border-l-4 border-green-500">
              <p className="font-medium text-green-800 dark:text-green-300 text-xs mb-1">Шаг 1: Прочитайте описание и код</p>
              <p className="text-xs">Поймите, что функция делает. Обратите внимание на проверки (if/throw) — это ключ к классам.</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border-l-4 border-blue-500">
              <p className="font-medium text-blue-800 dark:text-blue-300 text-xs mb-1">Шаг 2: Выпишите классы эквивалентности</p>
              <p className="text-xs">Для каждой проверки определите валидный и невалидный класс. Каждый «if/throw» = минимум 2 класса.</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border-l-4 border-amber-500">
              <p className="font-medium text-amber-800 dark:text-amber-300 text-xs mb-1">Шаг 3: Определите граничные значения</p>
              <p className="text-xs">Для [min, max] проверьте: min-1, min, min+1, max-1, max, max+1. Ищите особые точки: 0, null.</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border-l-4 border-purple-500">
              <p className="font-medium text-purple-800 dark:text-purple-300 text-xs mb-1">Шаг 4: Создайте тест-кейсы</p>
              <p className="text-xs">Для каждого класса и границы — по одному тесту. Указывайте категорию.</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3 border-l-4 border-rose-500">
              <p className="font-medium text-rose-800 dark:text-rose-300 text-xs mb-1">Шаг 5: Проверьте ожидаемые результаты</p>
              <p className="text-xs">Запустите через эталонную функцию. Ожидаемый результат должен совпадать с фактическим.</p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border-l-4 border-indigo-500">
              <p className="font-medium text-indigo-800 dark:text-indigo-300 text-xs mb-1">Шаг 6: Добавьте Error Guessing</p>
              <p className="text-xs">После формальных методов добавьте «хитрые» тесты: пробелы, эмодзи, длинные строки.</p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider mb-2">Чек-лист полноты</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Все валидные классы покрыты</span></div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Все невалидные классы покрыты</span></div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Все граничные значения протестированы</span></div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Проверены недопустимые типы</span></div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Ожидаемые результаты совпадают</span></div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Добавлены 1–2 error guessing теста</span></div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "exploratory",
      icon: <Search className="h-4 w-4" />,
      iconBg: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
      title: "Исследовательское тестирование",
      subtitle: "Одновременное обучение, дизайн и выполнение тестов",
      openBorder: "border-sky-300 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-950/20",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong>Исследовательское тестирование (Exploratory Testing)</strong> — это подход,
            при котором тестировщик одновременно изучает систему, проектирует тесты и выполняет их.
            В отличие от скриптового тестирования, здесь нет заранее написанных тест-кейсов.
          </p>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider">Ключевые принципы</p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-sky-500 mt-0.5 shrink-0">●</span>
                <span><strong>Одновременность</strong> — изучение, дизайн и выполнение происходят параллельно</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500 mt-0.5 shrink-0">●</span>
                <span><strong>Сессии</strong> — тестирование проводится в ограниченных по времени сессиях (60–90 мин)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500 mt-0.5 shrink-0">●</span>
                <span><strong>Хартия (charter)</strong> — каждая сессия имеет цель: «Исследовать валидацию email»</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500 mt-0.5 shrink-0">●</span>
                <span><strong>Заметки</strong> — фиксируйте находки, идеи и вопросы во время сессии</span>
              </li>
            </ul>
          </div>
          <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3">
            <p className="font-medium text-sky-800 dark:text-sky-300 text-xs mb-1 flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" /> Пример сессии
            </p>
            <p className="text-xs mb-1">
              <strong>Хартия:</strong> «Исследовать обработку невалидных email в форме регистрации»
            </p>
            <p className="text-xs mb-1">
              <strong>Время:</strong> 45 минут
            </p>
            <p className="text-xs mb-1">
              <strong>Находки:</strong> email "test@.com" принят как валидный; email с 255 символами вызвал timeout
            </p>
            <p className="text-xs">
              <strong>Результат:</strong> 2 бага, 3 идеи для дополнительных тест-кейсов
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider mb-2">Когда использовать</p>
            <ul className="space-y-1 text-xs">
              <li>• Когда нет спецификации или она неполная</li>
              <li>• Для быстрого исследования новой функциональности</li>
              <li>• Как дополнение к формальным методам (после EC/BV)</li>
              <li>• Для поиска неочевидных багов и edge cases</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "tdd",
      icon: <TestTube className="h-4 w-4" />,
      iconBg: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400",
      title: "Основы TDD",
      subtitle: "Разработка через тестирование: Red → Green → Refactor",
      openBorder: "border-pink-300 bg-pink-50/50 dark:border-pink-800 dark:bg-pink-950/20",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong>Test-Driven Development (TDD)</strong> — это метод разработки, при котором
            тесты пишутся ДО реализации. Цикл TDD: сначала напишите failing тест, затем реализуйте
            минимум для прохождения, затем улучшите код.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center border-2 border-red-200 dark:border-red-800">
              <p className="font-bold text-red-800 dark:text-red-300 text-sm mb-1">🔴 RED</p>
              <p className="text-xs">Напишите тест для функции, которой ещё нет. Тест падает.</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center border-2 border-emerald-200 dark:border-emerald-800">
              <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm mb-1">🟢 GREEN</p>
              <p className="text-xs">Реализуйте минимум кода, чтобы тест прошёл. Не оптимально — лишь бы работало.</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center border-2 border-blue-200 dark:border-blue-800">
              <p className="font-bold text-blue-800 dark:text-blue-300 text-sm mb-1">🔵 REFACTOR</p>
              <p className="text-xs">Улучшите код: уберите дубли, оптимизируйте. Тесты всё ещё проходят — вы уверены.</p>
            </div>
          </div>
          <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3">
            <p className="font-medium text-pink-800 dark:text-pink-300 text-xs mb-1 flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" /> Пример цикла для factorial
            </p>
            <p className="text-xs mb-1">
              <strong>RED:</strong> тест: factorial(5) === 120. Функции нет — тест падает.
            </p>
            <p className="text-xs mb-1">
              <strong>GREEN:</strong> реализация: <code className="font-mono bg-muted px-1 rounded">function factorial(n) {"{ return n <= 1 ? 1 : n * factorial(n - 1); }"}</code>
            </p>
            <p className="text-xs">
              <strong>REFACTOR:</strong> добавить проверку n &lt; 0 → throw Error. Тесты всё ещё зелёные.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider mb-2">Преимущества TDD</p>
            <ul className="space-y-1 text-xs">
              <li>• Код покрыт тестами с самого начала</li>
              <li>• Тесты помогают думать над дизайном API</li>
              <li>• Уверенность при рефакторинге</li>
              <li>• Тесты как документация: что должна делать функция</li>
              <li>• Меньше багов в продакшене</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "test-design",
      icon: <Target className="h-4 w-4" />,
      iconBg: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-400",
      title: "Техники тест-дизайна",
      subtitle: "Комбинация методов для максимального покрытия",
      openBorder: "border-fuchsia-300 bg-fuchsia-50/50 dark:border-fuchsia-800 dark:bg-fuchsia-950/20",
      content: (
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong>Техники тест-дизайна</strong> — это набор методов для создания эффективных тест-кейсов.
            Каждая техника покрывает определённый аспект, и вместе они дают максимальное покрытие.
          </p>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider">Матрица техник</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-fuchsia-100 dark:bg-fuchsia-900/40">
                    <th className="border border-fuchsia-300 dark:border-fuchsia-700 px-1.5 py-1 text-left">Техника</th>
                    <th className="border border-fuchsia-300 dark:border-fuchsia-700 px-1.5 py-1 text-left">Что покрывает</th>
                    <th className="border border-fuchsia-300 dark:border-fuchsia-700 px-1.5 py-1 text-left">Когда применять</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5 font-medium">Классы эквивалентности</td><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5">Все группы входов</td><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5">Всегда, базовый метод</td></tr>
                  <tr><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5 font-medium">Граничные значения</td><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5">Края диапазонов</td><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5">Есть числовые диапазоны</td></tr>
                  <tr><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5 font-medium">Таблица решений</td><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5">Комбинации условий</td><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5">Сложная бизнес-логика</td></tr>
                  <tr><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5 font-medium">Диаграммы состояний</td><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5">Переходы состояний</td><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5">Есть память/состояние</td></tr>
                  <tr><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5 font-medium">Попарное</td><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5">Пары параметров</td><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5">3+ параметров</td></tr>
                  <tr><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5 font-medium">Error Guessing</td><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5">Edge cases</td><td className="border border-fuchsia-200 dark:border-fuchsia-800 px-1.5 py-0.5">После формальных методов</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-fuchsia-50 dark:bg-fuchsia-900/20 rounded-lg p-3">
            <p className="font-medium text-fuchsia-800 dark:text-fuchsia-300 text-xs mb-1 flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" /> Стратегия для комплексной функции
            </p>
            <p className="text-xs mb-1">
              Для функции <code className="font-mono bg-muted px-1 rounded">validateUser(input)</code> с полями email, пароль, возраст, роль:
            </p>
            <ol className="text-xs space-y-1 list-decimal list-inside">
              <li>EC для каждого поля (валидный/невалидный email, длина пароля и т.д.)</li>
              <li>BV для возраста (min=13, max=120)</li>
              <li>Decision Table для комбинаций: валидный email + короткий пароль + underage</li>
              <li>Pairwise для роли (user/admin) × статуса (active/banned) × верификации (yes/no)</li>
              <li>Error Guessing: SQL-инъекции, XSS, эмодзи в имени</li>
            </ol>
          </div>
        </div>
      ),
    },
  ];

  return (
    <motion.div {...fadeIn} className="space-y-4">
      {/* Contextual banner when task is provided */}
      {task && (
        <Card className="border-blue-200 dark:border-blue-800 mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lightbulb className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground text-xs mb-1">
                  Текущее задание: {task.name}
                </p>
                <p className="text-xs">
                  Для этого задания рекомендуем обратить внимание на:
                  {" "}<strong>{task.topics.join(", ")}</strong>
                </p>
                <p className="text-xs mt-1">
                  Всего определено {task.equivalenceClasses.length} классов эквивалентности
                  и {task.boundaryValues.length} граничных значений.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Introduction */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Методы тестирования</h2>
              <p className="text-xs text-muted-foreground">
                Основы чёрного ящика для генерации тест-кейсов
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Тестирование по методу «чёрного ящика» (black-box testing) — это подход,
            при котором тестирование выполняется без знания внутреннего устройства кода.
            Тестировщик анализирует только входы и ожидаемые выходы функции.
          </p>
        </CardContent>
      </Card>

      {/* Theory progress bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Прогресс теории</span>
            <span className="text-xs text-muted-foreground">{theoryProgress.viewed}/{theoryProgress.total} разделов</span>
          </div>
          <Progress value={(theoryProgress.viewed / theoryProgress.total) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Theory sections grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sections.map((section) => (
          <TheorySectionCard
            key={section.id}
            section={section}
            isExpanded={openSections.has(section.id)}
            isViewed={viewedSections.has(section.id)}
            isRecommended={!!isRecommended(section.id)}
            onToggle={() => handleSectionToggle(section.id)}
          />
        ))}
      </div>

      {/* Worked example for current task */}
      {task && <WorkedExampleViewer taskId={task.id} />}
    </motion.div>
  );
}
