"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { quizQuestions } from "@/lib/constants";
import { Brain, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

export function TheoryQuiz() {
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
                <span className="text-violet-600 dark:text-violet-400 mr-1">{qi + 1}.</span>
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
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      {isWrong && (
                        <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
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
  );
}
