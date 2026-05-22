"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ChevronRight, Plus } from "lucide-react";
import { tasks, runReferenceFunction, type TestCaseCategory } from "@/lib/tasks";
import type { TestCase } from "@/lib/evaluator";
import { toast } from "sonner";

interface HintInfo {
  ecName: string;
  ecDescription: string;
  suggestedInput: string;
  exampleValues: string[];
  taskId: number;
}

export function HintDialog({
  testCases,
  onAddTestCase,
}: {
  testCases: TestCase[];
  onAddTestCase: (inputs: string[], expected: string, category: TestCaseCategory, comment: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<HintInfo | null>(null);
  const [step, setStep] = useState(0); // 0 = description, 1 = input, 2 = add button

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<HintInfo>).detail;
      setHint(detail);
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("show-hint", handler);
    return () => window.removeEventListener("show-hint", handler);
  }, []);

  const generateExpectedOutput = useCallback((inputStrs: string[]): string => {
    if (!hint) return "";
    const parsed = inputStrs.map((v) => {
      const num = Number(v);
      return !isNaN(num) && v.trim() !== "" ? num : v;
    });
    const { result, error } = runReferenceFunction(hint.taskId, parsed);
    return error ? `Ошибка: ${error}` : typeof result === "object" ? JSON.stringify(result) : String(result);
  }, [hint]);

  const inferCategory = useCallback((desc: string, hasError: boolean): TestCaseCategory => {
    const lower = desc.toLowerCase();
    if (lower.includes("ошибк") || lower.includes("недопустим") || lower.includes("переполнен") || lower.includes("неверный")) {
      return hasError ? "Исключение" : "Нормальное значение";
    }
    if (lower.includes("границ") || lower.includes("миним") || lower.includes("максим")) {
      return "Граничное значение";
    }
    return "Нормальное значение";
  }, []);

  const handleAddHintTestCase = useCallback(() => {
    if (!hint) return;
    const inputStrs = hint.suggestedInput.split(", ").map((s) => s.trim());
    const expected = generateExpectedOutput(inputStrs);
    const hasError = expected.startsWith("Ошибка:");
    const category = inferCategory(hint.ecDescription, hasError);
    onAddTestCase(inputStrs, expected, category, `Подсказка: ${hint.ecName}`);
    setOpen(false);
    toast.success(`Добавлен тест для «${hint.ecName}»`);
  }, [hint, generateExpectedOutput, inferCategory, onAddTestCase]);

  const handleNext = () => {
    if (hint && step < 2) setStep(step + 1);
  };

  if (!hint) return null;

  const expectedOutput = step >= 1 ? generateExpectedOutput(hint.suggestedInput.split(", ").map((s) => s.trim())) : null;
  const hasError = expectedOutput?.startsWith("Ошибка:");
  const category = expectedOutput ? inferCategory(hint.ecDescription, hasError ?? false) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <Lightbulb className="h-8 w-8 text-amber-500" />
          </div>
          <DialogTitle className="text-center">Подсказка</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-amber-500"
                  : i < step
                    ? "w-1.5 bg-amber-300 dark:bg-amber-700"
                    : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 0: EC description */}
        {step === 0 && (
          <div className="space-y-3">
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium">{hint.ecName}</p>
              <p className="text-xs text-muted-foreground mt-1">{hint.ecDescription}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Попробуйте создать тест-кейс, который проверяет этот класс эквивалентности
            </p>
          </div>
        )}

        {/* Step 1: Suggested input + expected output */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Рекомендуемый ввод:</p>
              <code className="text-sm font-mono bg-background px-2 py-1 rounded">{hint.suggestedInput}</code>
            </div>
            {expectedOutput && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Ожидаемый результат:</p>
                <code className={`text-sm font-mono bg-background px-2 py-1 rounded ${hasError ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {expectedOutput}
                </code>
                {category && (
                  <Badge variant="secondary" className={`mt-2 text-[10px] ${
                    category === "Исключение" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400" :
                    category === "Граничное значение" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                  }`}>
                    {category}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Add button */}
        {step === 2 && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Хотите автоматически добавить этот тест-кейс?
            </p>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleAddHintTestCase}
            >
              <Plus className="h-4 w-4 mr-1" />
              Добавить тест-кейс
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => setOpen(false)}
          >
            Закрыть
          </Button>
          {step < 2 && (
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleNext}
            >
              Далее
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
