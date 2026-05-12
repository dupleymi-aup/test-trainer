"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Task } from "@/lib/tasks";
import { quizQuestions } from "@/lib/constants";
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
  XCircle,
  RefreshCw,
} from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export function TheoryPanel({ task }: { task?: Task }) {
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const handleQuizAnswer = (questionIndex: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleQuizSubmit = () => {
    if (Object.keys(quizAnswers).length < quizQuestions.length) return;
    setQuizSubmitted(true);
  };

  const handleQuizReset = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const quizScore = quizSubmitted
    ? quizQuestions.reduce(
        (score, q, i) => score + (quizAnswers[i] === q.correctIndex ? 1 : 0),
        0
      )
    : 0;

  const allAnswered = Object.keys(quizAnswers).length === quizQuestions.length;
  return (
    <motion.div {...fadeIn} className="space-y-4">
      {/* Contextual banner when task is provided */}
      {task && (
        <Card className="border-blue-200 dark:border-blue-800 mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
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

      <Accordion type="multiple" className="space-y-3">
        {/* Equivalence Classes */}
        <AccordionItem
          value="ec"
          className="border rounded-lg px-4 data-[state=open]:border-emerald-300 data-[state=open]:bg-emerald-50/50 dark:data-[state=open]:border-emerald-800 dark:data-[state=open]:bg-emerald-950/20"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400">
                <Layers className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Классы эквивалентности</h3>
                <p className="text-xs text-muted-foreground">
                  Разделение входных данных на группы
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong>Классы эквивалентности</strong> — это метод тестирования, при котором
                входные данные разбиваются на группы (классы), внутри которых поведение
                функции одинаковое. Достаточно протестировать одно значение из каждого класса.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground text-xs uppercase tracking-wider">
                  Типы классов
                </p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">●</span>
                    <span>
                      <strong>Валидные классы</strong> — допустимые входные данные, для которых
                      функция должна работать корректно
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 mt-0.5">●</span>
                    <span>
                      <strong>Невалидные классы</strong> — недопустимые данные, которые должны
                      вызывать ошибку или исключение
                    </span>
                  </li>
                </ul>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                <p className="font-medium text-emerald-800 dark:text-emerald-300 text-xs mb-1 flex items-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Пример
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
          </AccordionContent>
        </AccordionItem>

        {/* Boundary Values */}
        <AccordionItem
          value="bv"
          className="border rounded-lg px-4 data-[state=open]:border-amber-300 data-[state=open]:bg-amber-50/50 dark:data-[state=open]:border-amber-800 dark:data-[state=open]:bg-amber-950/20"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                <GitBranch className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Граничные значения</h3>
                <p className="text-xs text-muted-foreground">
                  Тестирование на границах диапазонов
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong>Анализ граничных значений</strong> — это метод, основанный на том, что
                ошибки чаще всего возникают на границах диапазонов допустимых значений.
                Для каждого диапазона тестируются значения на границах и рядом с ними.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground text-xs uppercase tracking-wider">
                  Правила выбора граничных значений
                </p>
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
                  <Lightbulb className="h-3.5 w-3.5" />
                  Пример
                </p>
                <p className="text-xs">
                  Для диапазона 1 ≤ n ≤ 10:
                </p>
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
          </AccordionContent>
        </AccordionItem>

        {/* Test Case Categories */}
        <AccordionItem
          value="categories"
          className="border rounded-lg px-4 data-[state=open]:border-purple-300 data-[state=open]:bg-purple-50/50 dark:data-[state=open]:border-purple-800 dark:data-[state=open]:bg-purple-950/20"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Категории тест-кейсов</h3>
                <p className="text-xs text-muted-foreground">
                  Как классифицировать тесты
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                  <p className="font-medium text-emerald-800 dark:text-emerald-300 text-xs mb-1">
                    🟢 Нормальное значение
                  </p>
                  <p className="text-xs">
                    Обычные входные данные, находящиеся в допустимом диапазоне.
                    Функция должна корректно обработать и вернуть ожидаемый результат.
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                  <p className="font-medium text-amber-800 dark:text-amber-300 text-xs mb-1">
                    🟡 Граничное значение
                  </p>
                  <p className="text-xs">
                    Значения на границах диапазонов: минимум, максимум, переходные точки.
                    Здесь наиболее вероятны ошибки.
                  </p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3">
                  <p className="font-medium text-rose-800 dark:text-rose-300 text-xs mb-1">
                    🔴 Исключение
                  </p>
                  <p className="text-xs">
                    Входные данные, которые вызывают ошибку или исключение.
                    Проверяется корректная обработка неверных данных.
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                  <p className="font-medium text-purple-800 dark:text-purple-300 text-xs mb-1">
                    🟣 Недопустимый тип
                  </p>
                  <p className="text-xs">
                    Данные неверного типа: строка вместо числа, null вместо объекта и т.д.
                    Проверяется валидация входных данных.
                  </p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Tips */}
        <AccordionItem
          value="tips"
          className="border rounded-lg px-4 data-[state=open]:border-teal-300 data-[state=open]:bg-teal-50/50 dark:data-[state=open]:border-teal-800 dark:data-[state=open]:bg-teal-950/20"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Советы</h3>
                <p className="text-xs text-muted-foreground">
                  Лучшие практики тестирования
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5 shrink-0">1.</span>
                  <span>
                    <strong>Покройте все классы эквивалентности</strong> — для каждого класса
                    создайте хотя бы один тест-кейс
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5 shrink-0">2.</span>
                  <span>
                    <strong>Не забывайте о граничных значениях</strong> — тестируйте границы и
                    значения рядом с ними
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5 shrink-0">3.</span>
                  <span>
                    <strong>Тестируйте невалидные данные</strong> — проверьте, как функция
                    обрабатывает ошибки
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5 shrink-0">4.</span>
                  <span>
                    <strong>Проверяйте типы</strong> — передайте данные неверного типа и
                    убедитесь, что функция корректно обработает это
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5 shrink-0">5.</span>
                  <span>
                    <strong>Используйте осмысленные комментарии</strong> — записывайте, почему
                    выбран конкретный тест-кейс
                  </span>
                </li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>
        {/* State Transition Testing */}
        <AccordionItem
          value="state-transition"
          className="border rounded-lg px-4 data-[state=open]:border-cyan-300 data-[state=open]:bg-cyan-50/50 dark:data-[state=open]:border-cyan-800 dark:data-[state=open]:bg-cyan-950/20"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400">
                <ArrowLeftRight className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Диаграммы состояний</h3>
                <p className="text-xs text-muted-foreground">
                  Тестирование переходов между состояниями
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong>Тестирование переходов состояний</strong> — это метод, при котором
                тестируются переходы системы из одного состояния в другое под воздействием
                различных событий. Особенно полезен для функций с памятью или состоянием.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground text-xs uppercase tracking-wider">
                  Основные понятия
                </p>
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
                  <Lightbulb className="h-3.5 w-3.5" />
                  Пример: Банкомат
                </p>
                <p className="text-xs">
                  Состояния: «Карта вставлена», «PIN введён», «Ошибка».
                  Переходы: вставка карты → ввод PIN → правильный/неправильный PIN.
                  Тест-кейсы: все допустимые пути + попытка снять деньги без ввода PIN.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground text-xs uppercase tracking-wider">
                  Покрытие переходов
                </p>
                <ul className="space-y-1.5 text-xs">
                  <li>• <strong>0-switch coverage</strong> — тестирование каждого отдельного перехода</li>
                  <li>• <strong>1-switch coverage</strong> — тестирование последовательностей из двух переходов</li>
                  <li>• <strong>N-switch coverage</strong> — тестирование цепочек из N+1 переходов</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Decision Tables */}
        <AccordionItem
          value="decision-tables"
          className="border rounded-lg px-4 data-[state=open]:border-orange-300 data-[state=open]:bg-orange-50/50 dark:data-[state=open]:border-orange-800 dark:data-[state=open]:bg-orange-950/20"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Таблицы решений</h3>
                <p className="text-xs text-muted-foreground">
                  Систематический подход к логическим условиям
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong>Таблица решений</strong> — это метод, который систематизирует все комбинации
                логических условий и определяет ожидаемый результат для каждой комбинации. Это особенно
                полезно когда функция содержит сложные условные конструкции с несколькими ветвями.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground text-xs uppercase tracking-wider">
                  Шаги создания таблицы решений
                </p>
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
                    <span>Создайте тест-кейс для каждой уникальной комбинации (минимум одно правило из каждого класса эквивалентности комбинаций)</span>
                  </li>
                </ul>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                <p className="font-medium text-orange-800 dark:text-orange-300 text-xs mb-1 flex items-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Пример: Високосный год
                </p>
                <p className="text-xs">
                  Для isLeapYear(year) условия: year%4==0, year%100==0, year%400==0.
                  Комбинации: (T,T,T)→високосный, (T,T,F)→не високосный, (T,F,*)→високосный, (F,*,*)→не високосный.
                  Вместо 8 комбинаций достаточно 4 теста.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Pairwise Testing */}
        <AccordionItem
          value="pairwise"
          className="border rounded-lg px-4 data-[state=open]:border-indigo-300 data-[state=open]:bg-indigo-50/50 dark:data-[state=open]:border-indigo-800 dark:data-[state=open]:bg-indigo-950/20"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                <ArrowLeftRight className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Попарное тестирование</h3>
                <p className="text-xs text-muted-foreground">
                  Сокращение комбинаций с гарантированным покрытием пар
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong>Попарное тестирование (Pairwise Testing)</strong> — это техника создания тест-кейсов,
                при которой каждая пара параметров тестируется во всех возможных комбинациях значений.
                Это позволяет существенно сократить количество тестов по сравнению с полным перебором.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground text-xs uppercase tracking-wider">
                  Когда использовать
                </p>
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
                  <Lightbulb className="h-3.5 w-3.5" />
                  Пример
                </p>
                <p className="text-xs">
                  Функция с 3 параметрами, каждый с 3 значениями: 3×3×3 = 27 комбинаций.
                  Попарное покрытие гарантирует, что каждая пара значений появится хотя бы раз —
                  это требует всего 9 тестов вместо 27.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground text-xs uppercase tracking-wider">
                  Популярные инструменты
                </p>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>PICT</strong> (Microsoft) — генератор попарных тестов</li>
                  <li>• <strong>AllPairs</strong> — онлайн-генератор</li>
                  <li>• <strong>Pairwise Wizard</strong> — визуальный инструмент</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        {/* Testing Metrics */}
        <AccordionItem
          value="metrics"
          className="border rounded-lg px-4 data-[state=open]:border-violet-300 data-[state=open]:bg-violet-50/50 dark:data-[state=open]:border-violet-800 dark:data-[state=open]:bg-violet-950/20"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Метрики покрытия</h3>
                <p className="text-xs text-muted-foreground">
                  Как оценивается качество тестирования
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                В этом тренажёре оценка качества тестирования основана на трёх ключевых метриках.
                Каждая метрика измеряет отдельный аспект полноты тестирования.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                  <p className="font-medium text-emerald-800 dark:text-emerald-300 text-xs mb-1">
                    📊 Покрытие классов эквивалентности (40%)
                  </p>
                  <p className="text-xs">
                    Какая доля определённых классов эквивалентности покрыта вашими тестами.
                    Каждый уникальный класс засчитывается один раз, независимо от количества
                    тестов из него.
                  </p>
                  <p className="text-xs mt-1 font-mono bg-white/50 dark:bg-black/20 rounded p-1">
                    EC Coverage = покрытые EC / всего EC × 100%
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                  <p className="font-medium text-amber-800 dark:text-amber-300 text-xs mb-1">
                    📏 Покрытие граничных значений (30%)
                  </p>
                  <p className="text-xs">
                    Какая доля определённых граничных значений протестирована. Граничные значения
                    — это конкретные точки на границах диапазонов, а не целые области.
                  </p>
                  <p className="text-xs mt-1 font-mono bg-white/50 dark:bg-black/20 rounded p-1">
                    BV Coverage = покрытые BV / всего BV × 100%
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <p className="font-medium text-blue-800 dark:text-blue-300 text-xs mb-1">
                    ✅ Корректность ожиданий (30%)
                  </p>
                  <p className="text-xs">
                    Какая доля ваших ожидаемых результатов совпала с фактическим поведением
                    эталонной функции. Показывает, насколько правильно вы понимаете функцию.
                  </p>
                  <p className="text-xs mt-1 font-mono bg-white/50 dark:bg-black/20 rounded p-1">
                    Correctness = правильные ответы / всего тестов × 100%
                  </p>
                </div>
              </div>
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3">
                <p className="font-medium text-violet-800 dark:text-violet-300 text-xs mb-1 flex items-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Итоговая формула
                </p>
                <p className="text-xs font-mono bg-white/50 dark:bg-black/20 rounded p-1.5 mt-1">
                  Overall = EC×0.4 + BV×0.3 + Correctness×0.3
                </p>
                <p className="text-xs mt-1">
                  Веса выбраны так, что покрытие классов эквивалентности наиболее важно,
                  но корректность ожиданий и граничные значения тоже существенны.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground text-xs uppercase tracking-wider">
                  Градации оценок
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span><strong>90-100%</strong> — Отлично</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span><strong>75-89%</strong> — Хорошо</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span><strong>50-74%</strong> — Удовлетворительно</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span><strong>0-49%</strong> — Неудовлетворительно</span>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Error Guessing */}
        <AccordionItem
          value="error-guessing"
          className="border rounded-lg px-4 data-[state=open]:border-red-300 data-[state=open]:bg-red-50/50 dark:data-[state=open]:border-red-800 dark:data-[state=open]:bg-red-950/20"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Предугадывание ошибок</h3>
                <p className="text-xs text-muted-foreground">
                  Интуитивный поиск типичных дефектов
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong>Error Guessing</strong> — это техника тестирования, основанная на опыте,
                интуиции и знании типичных ошибок. Тестировщик предполагает, где могут быть
                дефекты, и создаёт тест-кейсы для этих ситуаций.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground text-xs uppercase tracking-wider">
                  Типичные «горячие точки»
                </p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5 shrink-0">●</span>
                    <span>Нулевые и пустые значения (<code className="font-mono bg-muted px-1 rounded">null</code>, <code className="font-mono bg-muted px-1 rounded">&quot;&quot;</code>, <code className="font-mono bg-muted px-1 rounded">0</code>)</span>
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
                    <span>Специальные символы в строках (<code className="font-mono bg-muted px-1 rounded">{`\'`}</code>, <code className="font-mono bg-muted px-1 rounded">{`"`}</code>, <code className="font-mono bg-muted px-1 rounded">&lt;&gt;</code>, <code className="font-mono bg-muted px-1 rounded">&amp;</code>)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5 shrink-0">●</span>
                    <span>Дубликаты в данных</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5 shrink-0">●</span>
                    <span>Юникод и разные языки (кириллица, эмодзи, арабский)</span>
                  </li>
                </ul>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1 flex items-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Примеры «хитрых» тестов
                </p>
                <ul className="text-xs space-y-1">
                  <li>• Строка из пробелов: <code className="font-mono bg-muted px-1 rounded">&quot;   &quot;</code></li>
                  <li>• Число с плавающей запятой: <code className="font-mono bg-muted px-1 rounded">3.14159</code></li>
                  <li>• Отрицательный ноль: <code className="font-mono bg-muted px-1 rounded">-0</code></li>
                  <li>• Очень длинная строка: <code className="font-mono bg-muted px-1 rounded">&quot;a&quot;.repeat(10000)</code></li>
                  <li>• Эмодзи: <code className="font-mono bg-muted px-1 rounded">&quot;🔥🎉&quot;</code></li>
                </ul>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-foreground text-xs uppercase tracking-wider mb-1">
                  Когда применять
                </p>
                <p className="text-xs">
                  Error Guessing — дополнительная техника. Используйте его <strong>после</strong>
                  формальных методов (классы эквивалентности, граничные значения) для нахождения
                  дефектов, которые формальные методы не покрывают.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Common Mistakes */}
        <AccordionItem
          value="common-mistakes"
          className="border rounded-lg px-4 data-[state=open]:border-yellow-300 data-[state=open]:bg-yellow-50/50 dark:data-[state=open]:border-yellow-800 dark:data-[state=open]:bg-yellow-950/20"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Типичные ошибки студентов</h3>
                <p className="text-xs text-muted-foreground">
                  Чего следует избегать при написании тестов
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <div className="space-y-3">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">
                    ❌ Дублирование тестов
                  </p>
                  <p className="text-xs">
                    Добавление нескольких тестов из одного класса эквивалентности не увеличивает
                    покрытие. Достаточно одного представителя из каждого класса.
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">
                    ❌ Игнорирование невалидных данных
                  </p>
                  <p className="text-xs">
                    Многие студенты тестируют только «правильные» входы. Но обработка ошибок —
                    важная часть покрытия. Не забывайте про исключения и недопустимые типы.
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">
                    ❌ Неправильный ожидаемый результат
                  </p>
                  <p className="text-xs">
                    Ожидаемый результат должен соответствовать реальному поведению функции,
                    а не тому, что вы «думаете» она должна вернуть.
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">
                    ❌ Пропуск граничных значений
                  </p>
                  <p className="text-xs">
                    Граничные значения — отдельный метод от классов эквивалентности.
                    Даже если класс покрыт, граница может быть не протестирована.
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <p className="font-medium text-red-800 dark:text-red-300 text-xs mb-1">
                    ❌ Пустые комментарии
                  </p>
                  <p className="text-xs">
                    Комментарии к тест-кейсам помогают объяснить, почему выбран именно этот
                    вход. «Тест для EC1» — плохой комментарий; «Граничное значение: n=0» — хороший.
                  </p>
                </div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                <p className="font-medium text-emerald-800 dark:text-emerald-300 text-xs mb-1 flex items-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Как избежать
                </p>
                <ul className="text-xs space-y-1">
                  <li>1. Сначала проанализируйте функцию и выпишите все классы</li>
                  <li>2. Определите граничные значения для каждого диапазона</li>
                  <li>3. Создайте по одному тесту на каждый класс и границу</li>
                  <li>4. Проверьте ожидаемые результаты по коду функции</li>
                  <li>5. Добавьте error guessing тесты для полноты</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Interactive Quiz */}
      <Card className="border-violet-200 dark:border-violet-800 mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-violet-600" />
            Проверь себя
            <span className="text-xs font-normal text-muted-foreground ml-auto">
              {quizQuestions.length} вопросов
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {quizSubmitted && (
            <div className="text-center py-2">
              <p className="text-lg font-bold">
                Результат: {quizScore}/{quizQuestions.length}
              </p>
              <Progress
                value={(quizScore / quizQuestions.length) * 100}
                className="h-2 mt-2"
              />
            </div>
          )}

          {quizQuestions.map((q, qi) => {
            const userAnswer = quizAnswers[qi];
            const isCorrect = quizSubmitted && userAnswer === q.correctIndex;
            const isWrong = quizSubmitted && userAnswer !== undefined && userAnswer !== q.correctIndex;

            return (
              <div key={q.id} className="space-y-2">
                <p className="text-sm font-medium">
                  <span className="text-violet-600 mr-1">{qi + 1}.</span>
                  {q.question}
                </p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => {
                    let optClass = "border-border hover:border-violet-300 dark:hover:border-violet-700";
                    if (quizSubmitted) {
                      if (oi === q.correctIndex) {
                        optClass = "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20";
                      } else if (oi === userAnswer && oi !== q.correctIndex) {
                        optClass = "border-rose-400 bg-rose-50 dark:bg-rose-900/20";
                      } else {
                        optClass = "border-border opacity-50";
                      }
                    } else if (oi === userAnswer) {
                      optClass = "border-violet-400 bg-violet-50 dark:bg-violet-900/20";
                    }

                    return (
                      <button
                        key={oi}
                        onClick={() => handleQuizAnswer(qi, oi)}
                        disabled={quizSubmitted}
                        className={`w-full text-left text-xs p-2.5 rounded-lg border transition-colors flex items-center gap-2 ${optClass}`}
                      >
                        {quizSubmitted && oi === q.correctIndex && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        )}
                        {isWrong && (
                          <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        )}
                        {!quizSubmitted && (
                          <span
                            className={`w-3.5 h-3.5 rounded-full border shrink-0 flex items-center justify-center ${
                              oi === userAnswer
                                ? "border-violet-500 bg-violet-500"
                                : "border-muted-foreground/30"
                            }`}
                          >
                            {oi === userAnswer && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </span>
                        )}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {quizSubmitted && (
                  <p className="text-[11px] text-muted-foreground bg-muted/30 rounded p-2">
                    {q.explanation}
                  </p>
                )}
              </div>
            );
          })}

          <div className="flex gap-2 pt-2">
            {!quizSubmitted ? (
              <Button
                onClick={handleQuizSubmit}
                disabled={!allAnswered}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              >
                Проверить ответы
              </Button>
            ) : (
              <Button
                onClick={handleQuizReset}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Пройти заново
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
