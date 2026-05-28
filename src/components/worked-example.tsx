"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, BookOpen, Lightbulb, Code, CheckCircle2, Target } from "lucide-react";
import { getWorkedExample, type WorkedExample } from "@/lib/worked-examples";

const categoryBadgeStyles: Record<string, string> = {
  "Нормальное значение": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Граничное значение": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Исключение": "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  "Недопустимый тип": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

function StepCard({ step }: { step: WorkedExample["steps"][number] }) {
  const [isOpen, setIsOpen] = useState(step.stepNumber <= 2);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left">
          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400 text-xs font-bold shrink-0">
              {step.stepNumber}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.action}</p>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-10 pr-3 pb-3 space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" /> Рассуждение
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400">{step.reasoning}</p>
          </div>
          {step.example && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Code className="h-3.5 w-3.5" /> Тест-кейс
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground mb-0.5">Вход:</p>
                  <code className="font-mono bg-background px-2 py-1 rounded text-sm block">{step.example.input}</code>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Ожидание:</p>
                  <code className={`font-mono bg-background px-2 py-1 rounded text-sm block ${
                    step.example.expectedOutput.startsWith("Ошибка")
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {step.example.expectedOutput}
                  </code>
                </div>
              </div>
              <Badge variant="secondary" className={`mt-2 text-[10px] ${categoryBadgeStyles[step.example.category] || "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-200"}`}>
                {step.example.category}
              </Badge>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function WorkedExampleViewer({ taskId }: { taskId: number }) {
  const example = getWorkedExample(taskId);
  const [showAll, setShowAll] = useState(false);

  if (!example) return null;

  const stepsToShow = showAll ? example.steps : example.steps.slice(0, 3);

  return (
    <Card className="border-teal-200 dark:border-teal-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          Разбор эксперта: {example.taskName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{example.introduction}</p>

        <div className="space-y-1">
          {stepsToShow.map((step) => (
            <StepCard key={step.stepNumber} step={step} />
          ))}
        </div>

        {!showAll && example.steps.length > 3 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowAll(true)}
          >
            Показать все {example.steps.length} шагов
            <ChevronDown className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}

        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Ключевые выводы
          </p>
          <ul className="space-y-1">
            {example.keyTakeaways.map((takeaway, i) => (
              <li key={i} className="text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
                <Target className="h-3 w-3 shrink-0 mt-0.5" />
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
