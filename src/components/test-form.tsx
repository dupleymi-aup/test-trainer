"use client";

import { useState, useCallback, useMemo } from "react";
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
import { categories } from "@/lib/constants";
import { calculateResult } from "@/lib/calculate";

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

  const categoryOptions = useMemo(() => {
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
    const dotColors: Record<TestCaseCategory, string> = {
      "Нормальное значение": "bg-emerald-500 dark:bg-emerald-400",
      "Граничное значение": "bg-amber-500 dark:bg-amber-400",
      "Исключение": "bg-rose-500 dark:bg-rose-400",
      "Недопустимый тип": "bg-purple-500 dark:bg-purple-400",
    };
    return categories.map((cat) => ({
      cat,
      ...descriptions[cat],
      dotColor: dotColors[cat],
    }));
  }, [t]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (inputs.some((v) => v.trim() === "") || !expected.trim()) return;
    onAdd(inputs, expected.trim(), category, comment.trim());
    setInputs(task.params.map(() => ""));
    setExpected("");
    setComment("");
  }, [inputs, expected, category, comment, task.params, onAdd]);

  const handleCalculate = useCallback(() => {
    if (inputs.some((v) => v.trim() === "")) return;
    setIsCalculating(true);
    calculateResult({
      inputs,
      taskId: task.id,
      onResult: setExpected,
      onError: (msg) => setExpected(`${t("error")} ${msg}`),
      onFinally: () => setIsCalculating(false),
    });
  }, [inputs, task.id, t]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (inputs.some((v) => v.trim() === "") || !expected.trim()) return;
      onAdd(inputs, expected.trim(), category, comment.trim());
      setInputs(task.params.map(() => ""));
      setExpected("");
      setComment("");
    }
  }, [inputs, expected, category, comment, task.params, onAdd]);

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
                {categoryOptions.map(({ cat, desc, example, dotColor }) => (
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
                          <p className="text-[11px] text-muted-foreground mb-1">{desc}</p>
                          <p className="text-[11px] font-mono bg-muted/50 rounded px-1.5 py-0.5">
                            {example}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </SelectItem>
                ))}
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
