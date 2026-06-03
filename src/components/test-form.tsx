"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Calculator, HelpCircle } from "lucide-react";
import type { Task, TestCaseCategory } from "@/lib/tasks";
import { runReferenceFunction } from "@/lib/tasks";
import { categories } from "@/lib/constants";
import { logger } from "@/lib/logger";

interface TestFormProps {
  task: Task;
  onAdd: (inputs: string[], expected: string, category: TestCaseCategory, comment: string) => void;
}

export function TestForm({ task, onAdd }: TestFormProps) {
  const t = useTranslations("trainer");
  const [inputs, setInputs] = useState<string[]>(
    task.params.map(() => "")
  );
  const [expected, setExpected] = useState("");
  const [category, setCategory] = useState<TestCaseCategory>(t("categoryNormal") as TestCaseCategory);
  const [comment, setComment] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputs.some((v) => v.trim() === "") || !expected.trim()) return;
    onAdd(inputs, expected.trim(), category, comment.trim());
    setInputs(task.params.map(() => ""));
    setExpected("");
    setComment("");
  };

  // Parse input string to typed value (same logic as evaluator)
  const parseInputForRef = useCallback((v: string) => {
    const trimmed = v.trim();
    if (trimmed === "true" || trimmed === "да" || trimmed === "верно") return true;
    if (trimmed === "false" || trimmed === "нет" || trimmed === "неверно") return false;
    if (trimmed === "null") return null;
    const num = Number(trimmed);
    if (trimmed !== "" && !isNaN(num) && /^-?\d+(\.\d+)?$/.test(trimmed)) return num;
    try { const p = JSON.parse(trimmed); if (typeof p === "object") return p; } catch { if (process.env.NODE_ENV === "development") logger.debug("parseInputForRef: JSON.parse failed", { input: trimmed }); }
    return trimmed;
  }, []);

  const handleCalculate = useCallback(() => {
    if (inputs.some((v) => v.trim() === "")) return;
    setIsCalculating(true);
    // Use requestAnimationFrame so the button shows loading state
    requestAnimationFrame(() => {
      try {
        const parsedInputs = inputs.map(parseInputForRef);
        const { result, error } = runReferenceFunction(task.id, parsedInputs);
        if (error) {
          setExpected(`${t("error")} ${error}`);
        } else {
          const output = typeof result === "object" ? JSON.stringify(result) : String(result);
          setExpected(output);
        }
      } catch {
        setExpected(t("computationError"));
      } finally {
        setIsCalculating(false);
      }
    });
  }, [inputs, task.id, parseInputForRef, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Ctrl+Enter or Cmd+Enter to submit from any input
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (inputs.some((v) => v.trim() === "") || !expected.trim()) return;
      onAdd(inputs, expected.trim(), category, comment.trim());
      setInputs(task.params.map(() => ""));
      setExpected("");
      setComment("");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          {t("addTestCase")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-3">
          {task.params.map((param, idx) => (
            <div key={param.name} className="space-y-1">
              <Label className="text-xs font-medium">
                {param.name}
                <span className="text-muted-foreground ml-1">
                  ({param.type})
                </span>
              </Label>
              <Input
                placeholder={
                  param.type === "string"
                    ? t("placeholderInputString")
                    : param.type === "boolean"
                      ? t("placeholderInputBoolean")
                      : t("placeholderInputNumber")
                }
                value={inputs[idx]}
                onChange={(e) => {
                  const newInputs = [...inputs];
                  newInputs[idx] = e.target.value;
                  setInputs(newInputs);
                }}
                className="h-9 text-sm"
              />
            </div>
          ))}

          <div className="space-y-1">
            <Label className="text-xs font-medium">{t("expectedResult")}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={
                  task.returnType === "boolean"
                    ? t("placeholderExpectedBoolean")
                    : task.returnType === "string"
                      ? t("placeholderExpectedString")
                      : task.returnType.startsWith("{")
                        ? t("placeholderExpectedObject")
                        : t("placeholderExpectedNumber")
                }
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                className="h-9 text-sm flex-1"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={handleCalculate}
                    disabled={inputs.some((v) => v.trim() === "") || isCalculating}
                    aria-label={t("calculateExpected")}
                  >
                    <Calculator className={`h-4 w-4 ${isCalculating ? "animate-spin" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("calculateExpected")}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">{t("categoryLabel")}</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as TestCaseCategory)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => {
                  const descriptions: Record<TestCaseCategory, { desc: string; example: string }> = {
                    "Нормальное значение": {
                      desc: t("categoryDescNormal"),
                      example: t("exampleNormal"),
                    },
                    "Граничное значение": {
                      desc: t("categoryDescBoundary"),
                      example: t("exampleBoundary"),
                    },
                    "Исключение": {
                      desc: t("categoryDescException"),
                      example: t("exampleException"),
                    },
                    "Недопустимый тип": {
                      desc: t("categoryDescInvalidType"),
                      example: t("exampleInvalidType"),
                    },
                  };
                  const info = descriptions[cat];
                  const dotColor =
                    cat === "Нормальное значение"
                      ? "bg-emerald-500 dark:bg-emerald-400"
                      : cat === "Граничное значение"
                        ? "bg-amber-500 dark:bg-amber-400"
                        : cat === "Исключение"
                          ? "bg-rose-500 dark:bg-rose-400"
                          : "bg-purple-500 dark:bg-purple-400";

                  return (
                    <SelectItem key={cat} value={cat}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
                        {cat}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[260px]">
                            <p className="text-xs font-medium mb-1">{cat}</p>
                            <p className="text-[11px] text-muted-foreground mb-1">{info.desc}</p>
                            <p className="text-[11px] font-mono bg-muted/50 rounded px-1.5 py-0.5">
                              {info.example}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">
              {t("commentLabel")}{" "}
              <span className="text-muted-foreground">{t("optional")}</span>
            </Label>
            <Textarea
              placeholder={t("placeholderComment")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="text-sm min-h-[60px] resize-none"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={inputs.some((v) => v.trim() === "") || !expected.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("addTestCaseButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
