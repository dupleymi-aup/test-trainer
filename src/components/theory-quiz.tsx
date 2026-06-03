"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { quizQuestions } from "@/lib/constants";
import type { QuizQuestion } from "@/lib/constants";
import { Brain, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

type QuizAnswer = Record<number, number | number[] | string>;

function isAnswerCorrect(q: QuizQuestion, answer: number | number[] | string | undefined): boolean {
  if (answer === undefined) return false;
  switch (q.type) {
    case "single":
    case "truefalse":
      return answer === q.correctIndex;
    case "multiple":
      if (!Array.isArray(answer)) return false;
      if (answer.length !== q.correctIndices.length) return false;
      const sorted = [...answer].sort();
      const correct = [...q.correctIndices].sort();
      return sorted.every((v, i) => v === correct[i]);
    case "text": {
      const userAnswer = String(answer).trim().toLowerCase();
      const correct = q.correctAnswer.toLowerCase();
      // For numeric answers, allow some flexibility
      const userNum = Number(userAnswer);
      const correctNum = Number(correct);
      if (!isNaN(userNum) && !isNaN(correctNum)) return userNum === correctNum;
      return userAnswer === correct;
    }
  }
}

export function TheoryQuiz() {
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const handleSingleAnswer = (questionIndex: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleMultipleAnswer = (questionIndex: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => {
      const current = (prev[questionIndex] as number[]) || [];
      const updated = current.includes(optionIndex)
        ? current.filter((i) => i !== optionIndex)
        : [...current, optionIndex];
      return { ...prev, [questionIndex]: updated };
    });
  };

  const handleTextAnswer = (questionIndex: number, value: string) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [questionIndex]: value }));
  };

  const handleQuizSubmit = () => {
    if (getAnsweredCount() < quizQuestions.length) return;
    setQuizSubmitted(true);
  };

  const handleQuizReset = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const quizScore = quizSubmitted
    ? quizQuestions.reduce(
        (score, q, i) => score + (isAnswerCorrect(q, quizAnswers[i]) ? 1 : 0),
        0
      )
    : 0;

  const getAnsweredCount = () => {
    let count = 0;
    quizQuestions.forEach((q, idx) => {
      const answer = quizAnswers[idx];
      if (answer !== undefined) {
        if (q.type === "multiple") {
          if (Array.isArray(answer) && answer.length > 0) count++;
        } else if (q.type === "text") {
          if (String(answer).trim().length > 0) count++;
        } else {
          count++;
        }
      }
    });
    return count;
  };

  const allAnswered = getAnsweredCount() === quizQuestions.length;

  const typeLabels: Record<string, { label: string; color: string }> = {
    single: { label: "Выбор ответа", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400" },
    truefalse: { label: "Верно/Неверно", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
    multiple: { label: "Несколько ответов", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
    text: { label: "Ввод ответа", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  };

  return (
    <Card className="border-violet-200 dark:border-violet-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          Проверь себя
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            {quizQuestions.length} вопросов
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quizSubmitted && (
          <div className="text-center py-2">
            <p className="text-lg font-bold text-foreground dark:text-foreground">
              Результат: {quizScore}/{quizQuestions.length}
            </p>
            <Progress
              value={(quizScore / quizQuestions.length) * 100}
              className="h-2 mt-2"
            />
          </div>
        )}

        {quizQuestions.map((q, qi) => {
          const answer = quizAnswers[qi];
          const isCorrect = quizSubmitted && isAnswerCorrect(q, answer);
          const isWrong = quizSubmitted && !isAnswerCorrect(q, answer);
          const typeInfo = typeLabels[q.type];

          return (
            <div key={q.id} className="space-y-2 p-3 rounded-lg border border-border/50">
              <div className="flex items-start gap-2">
                <span className="text-violet-600 dark:text-violet-400 font-medium text-sm shrink-0">{qi + 1}.</span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{q.question}</p>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${typeInfo.color}`}>
                      {typeInfo.label}
                    </Badge>
                  </div>
                </div>
              </div>

              {q.type === "single" && (
                <div className="space-y-1.5 ml-6">
                  {q.options.map((opt, oi) => {
                    let optClass = "border-border hover:border-violet-300 dark:hover:border-violet-700";
                    if (quizSubmitted) {
                      if (oi === q.correctIndex) {
                        optClass = "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20";
                      } else if (oi === answer && oi !== q.correctIndex) {
                        optClass = "border-rose-400 bg-rose-50 dark:bg-rose-900/20";
                      } else {
                        optClass = "border-border opacity-50";
                      }
                    } else if (oi === answer) {
                      optClass = "border-violet-400 bg-violet-50 dark:bg-violet-900/20";
                    }

                    return (
                      <button
                        key={oi}
                        onClick={() => handleSingleAnswer(qi, oi)}
                        disabled={quizSubmitted}
                        className={`w-full text-left text-xs p-2.5 rounded-lg border transition-colors flex items-center gap-2 ${optClass}`}
                      >
                        {quizSubmitted && oi === q.correctIndex && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                        {isWrong && oi === answer && (
                          <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                        )}
                        {!quizSubmitted && (
                          <span
                            className={`w-3.5 h-3.5 rounded-full border shrink-0 flex items-center justify-center ${
                              oi === answer
                                ? "border-violet-500 bg-violet-500"
                                : "border-muted-foreground/30"
                            }`}
                          >
                            {oi === answer && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-white/50" />
                            )}
                          </span>
                        )}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === "truefalse" && (
                <div className="flex gap-2 ml-6">
                  {q.options.map((opt, oi) => {
                    let optClass = "border-border hover:border-blue-300 dark:hover:border-blue-700";
                    if (quizSubmitted) {
                      if (oi === q.correctIndex) {
                        optClass = "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20";
                      } else if (oi === answer && oi !== q.correctIndex) {
                        optClass = "border-rose-400 bg-rose-50 dark:bg-rose-900/20";
                      } else {
                        optClass = "border-border opacity-50";
                      }
                    } else if (oi === answer) {
                      optClass = "border-blue-400 bg-blue-50 dark:bg-blue-900/20";
                    }

                    return (
                      <button
                        key={oi}
                        onClick={() => handleSingleAnswer(qi, oi)}
                        disabled={quizSubmitted}
                        className={`flex-1 text-center text-sm p-3 rounded-lg border transition-colors ${optClass}`}
                      >
                        {quizSubmitted && oi === q.correctIndex ? (
                          <span className="flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            {opt}
                          </span>
                        ) : isWrong && oi === answer ? (
                          <span className="flex items-center justify-center gap-1">
                            <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            {opt}
                          </span>
                        ) : (
                          opt
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === "multiple" && (
                <div className="space-y-1.5 ml-6">
                  {q.options.map((opt, oi) => {
                    const isSelected = Array.isArray(answer) && answer.includes(oi);
                    let optClass = "border-border hover:border-amber-300 dark:hover:border-amber-700";
                    if (quizSubmitted) {
                      if (q.correctIndices.includes(oi)) {
                        optClass = "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20";
                      } else if (isSelected && !q.correctIndices.includes(oi)) {
                        optClass = "border-rose-400 bg-rose-50 dark:bg-rose-900/20";
                      } else {
                        optClass = "border-border opacity-50";
                      }
                    } else if (isSelected) {
                      optClass = "border-amber-400 bg-amber-50 dark:bg-amber-900/20";
                    }

                    return (
                      <button
                        key={oi}
                        onClick={() => handleMultipleAnswer(qi, oi)}
                        disabled={quizSubmitted}
                        className={`w-full text-left text-xs p-2.5 rounded-lg border transition-colors flex items-center gap-2 ${optClass}`}
                      >
                        {quizSubmitted && q.correctIndices.includes(oi) && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                        {isWrong && isSelected && !q.correctIndices.includes(oi) && (
                          <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                        )}
                        {!quizSubmitted && (
                          <span
                            className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${
                              isSelected
                                ? "border-amber-500 bg-amber-500 dark:border-amber-400 dark:bg-amber-400"
                                : "border-muted-foreground/30"
                            }`}
                          >
                            {isSelected && (
                              <CheckCircle2 className="h-2.5 w-2.5 text-white dark:text-white/80" />
                            )}
                          </span>
                        )}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === "text" && (
                <div className="ml-6">
                  <Input
                    type="text"
                    value={typeof answer === "string" ? answer : ""}
                    onChange={(e) => handleTextAnswer(qi, e.target.value)}
                    disabled={quizSubmitted}
                    placeholder="Введите ваш ответ..."
                    className={`text-sm ${
                      quizSubmitted
                        ? isCorrect
                          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                          : "border-rose-400 bg-rose-50 dark:bg-rose-900/20"
                        : ""
                    }`}
                  />
                  {quizSubmitted && (
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      {isCorrect ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      )}
                      <span className="text-muted-foreground">
                        Правильный ответ: <strong className="text-foreground">{q.correctAnswer}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {quizSubmitted && (
                <p className="text-[11px] text-muted-foreground bg-muted/30 rounded p-2 ml-6">
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
              Проверить ответы ({getAnsweredCount()}/{quizQuestions.length})
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
  );
}
