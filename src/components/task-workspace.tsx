"use client";

import { useState, useEffect, useMemo, useDeferredValue } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Tag,
  Layers,
  GitBranch,
  Info,
  StickyNote,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Eye,
  Pencil,
  Lightbulb,
  Code2,
} from "lucide-react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Task } from "@/lib/tasks";
import { saveTaskNote, loadTaskNote } from "@/lib/storage";
import type { TestCase } from "@/lib/evaluator";
import { evaluateTestCases } from "@/lib/evaluator";
import { MarkdownPreview } from "@/components/markdown-preview";

interface TaskWorkspaceProps {
  task: Task;
  testCases?: TestCase[];
}

export function TaskWorkspace({ task, testCases }: TaskWorkspaceProps) {
  return <TaskWorkspaceInner key={task.id} task={task} testCases={testCases} />;
}

function TaskWorkspaceInner({ task, testCases }: TaskWorkspaceProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [note, setNote] = useState(() => loadTaskNote(task.id));
  const [noteViewMode, setNoteViewMode] = useState(false);
  const [expandedEcs, setExpandedEcs] = useState<Set<string>>(new Set());
  const [expandedBvs, setExpandedBvs] = useState<Set<number>>(new Set());
  const [mistakesOpen, setMistakesOpen] = useState(false);

  const handleBlur = () => {
    saveTaskNote(task.id, note);
  };

  // Defer expensive coverage computation to keep UI responsive during rapid test case changes
  const deferredTestCases = useDeferredValue(testCases);

  // Live coverage computation (deferred)
  const coverage = useMemo(() => {
    if (!deferredTestCases || deferredTestCases.length === 0) return null;
    return evaluateTestCases(task, deferredTestCases);
  }, [task, deferredTestCases]);

  const toggleEc = (id: string) => {
    setExpandedEcs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBv = (idx: number) => {
    setExpandedBvs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const maxNoteLength = 2000;

  const formatExampleValue = (val: unknown): string => {
    if (Array.isArray(val)) return `[${val.join(", ")}]`;
    if (typeof val === "string") return `"${val}"`;
    return String(val);
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-4">
        {/* Task info */}
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Info className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-base">{task.name}</CardTitle>
              <Badge variant="secondary" className="ml-auto text-xs">
                {task.difficulty}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {task.description}
            </p>

            {/* Signature */}
            <div className="bg-zinc-900 dark:bg-zinc-950 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-zinc-400">
                  Сигнатура функции
                </span>
              </div>
              <code className="text-sm font-mono text-emerald-300">
                {task.signature}
              </code>
            </div>

            {/* Parameters */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Параметры</span>
              </div>
              <div className="space-y-1.5">
                {task.params.map((param) => (
                  <div
                    key={param.name}
                    className="flex items-center gap-2 text-xs bg-muted/50 rounded-md p-2"
                  >
                    <code className="font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                      {param.name}
                    </code>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {param.type}
                    </Badge>
                    <span className="text-muted-foreground ml-auto">
                      {param.description}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md p-2">
                  <span className="text-muted-foreground">Возвращаемое:</span>
                  <code className="font-mono text-teal-700 dark:text-teal-400 font-medium">
                    {task.returnType}
                  </code>
                </div>
              </div>
            </div>

            {/* Code */}
            <div className="rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 dark:bg-zinc-950">
                <span className="text-xs font-medium text-zinc-400">
                  Реализация
                </span>
              </div>
              <SyntaxHighlighter
                language="typescript"
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  fontSize: "0.75rem",
                  lineHeight: 1.625,
                }}
                showLineNumbers
                wrapLines
              >
                {task.code}
              </SyntaxHighlighter>
            </div>

            {/* Equivalence classes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-teal-600" />
                <span className="text-xs font-medium">
                  Классы эквивалентности ({task.equivalenceClasses.length})
                </span>
                {coverage && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {coverage.coveredEcsCount}/{coverage.totalEcs}
                  </Badge>
                )}
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                {task.equivalenceClasses.map((ec) => {
                  const isCovered = coverage?.coveredEcIds.includes(ec.id) ?? false;
                  const isExpanded = expandedEcs.has(ec.id);
                  return (
                    <div
                      key={ec.id}
                      className={`text-xs rounded-md p-2 space-y-1 border transition-colors ${
                        coverage
                          ? isCovered
                            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                            : "bg-muted/30 border-border"
                          : "bg-muted/50 border-transparent"
                      }`}
                    >
                      <button
                        onClick={() => toggleEc(ec.id)}
                        className="w-full flex items-center gap-2 text-left"
                      >
                        {coverage && (
                          isCovered ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-rose-400/60 shrink-0" />
                          )
                        )}
                        {!coverage && <Tag className="h-3 w-3 text-teal-500 shrink-0" />}
                        <span className="font-medium">{ec.name}</span>
                        <ChevronRight className={`h-3 w-3 text-muted-foreground ml-auto transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </button>
                      <p className="text-muted-foreground pl-5 text-[11px]">
                        {ec.description}
                      </p>
                      {isExpanded && ec.exampleValues.length > 0 && (
                        <div className="pl-5 pt-1">
                          <span className="text-[10px] font-medium text-muted-foreground">Примеры:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ec.exampleValues.map((val, i) => (
                              <code
                                key={i}
                                className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]"
                              >
                                {formatExampleValue(val)}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Boundary values */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GitBranch className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-medium">
                  Граничные значения ({task.boundaryValues.length})
                </span>
                {coverage && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {coverage.coveredBvsCount}/{coverage.totalBvs}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {task.boundaryValues.map((bv, idx) => {
                  const isCovered = coverage?.coveredBvDescriptions.includes(bv.description) ?? false;
                  const isExpanded = expandedBvs.has(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleBv(idx)}
                      className={`text-xs rounded-md px-2 py-1 border transition-colors text-left ${
                        coverage
                          ? isCovered
                            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                            : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                          : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {coverage && (
                          isCovered ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="h-3 w-3 text-rose-400/60 shrink-0" />
                          )
                        )}
                        <code className="font-mono text-amber-800 dark:text-amber-300">
                          {Array.isArray(bv.value)
                            ? `[${bv.value.join(", ")}]`
                            : String(bv.value)}
                        </code>
                      </div>
                      {isExpanded && (
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">
                          {bv.description}
                        </span>
                      )}
                      {!isExpanded && !coverage && (
                        <span className="text-muted-foreground ml-1 hidden sm:inline text-[10px]">
                          — {bv.description}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Common Mistakes */}
        {task.commonMistakes && task.commonMistakes.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-800">
            <button
              onClick={() => setMistakesOpen(!mistakesOpen)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 rounded-t-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold">Типичные ошибки</span>
                <Badge variant="secondary" className="text-[10px]">
                  {task.commonMistakes.length}
                </Badge>
              </div>
              {mistakesOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {mistakesOpen && (
              <div className="px-4 pb-4 space-y-2">
                {task.commonMistakes.map((mistake, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 text-xs text-muted-foreground leading-relaxed bg-amber-50/50 dark:bg-amber-900/10 rounded-md p-2.5"
                  >
                    <span className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">⚠</span>
                    <span>{mistake}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Notes Section */}
        <Card>
          <button
            onClick={() => setNotesOpen(!notesOpen)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 rounded-t-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold">Мои заметки</span>
              {note.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {note.length}
                </Badge>
              )}
            </div>
            {notesOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {notesOpen && (
            <div className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant={noteViewMode ? "default" : "outline"}
                    size="sm"
                    className={`text-xs gap-1 h-6 px-2 ${noteViewMode ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                    onClick={() => setNoteViewMode(true)}
                    title="Режим просмотра"
                  >
                    <Eye className="h-3 w-3" />
                    Просмотр
                  </Button>
                  <Button
                    variant={!noteViewMode ? "default" : "outline"}
                    size="sm"
                    className={`text-xs gap-1 h-6 px-2 ${!noteViewMode ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                    onClick={() => setNoteViewMode(false)}
                    title="Режим редактирования"
                  >
                    <Pencil className="h-3 w-3" />
                    Редактирование
                  </Button>
                </div>
              </div>

              {noteViewMode ? (
                note.length > 0 ? (
                  <div className="p-3 bg-muted/30 rounded-lg min-h-[100px]">
                    <MarkdownPreview text={note} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Заметка пуста. Переключитесь в режим редактирования.
                  </p>
                )
              ) : (
                <>
                  <Textarea
                    value={note}
                    onChange={(e) => {
                      if (e.target.value.length <= maxNoteLength) {
                        setNote(e.target.value);
                      }
                    }}
                    onBlur={handleBlur}
                    placeholder="Запишите свои мысли, идеи или наблюдения по этому заданию...

Поддерживается **жирный**, *курсив*, `код`, - списки"
                    className="min-h-[100px] text-sm resize-y font-mono text-xs"
                  />
                  <div className="text-right text-[10px] text-muted-foreground">
                    {note.length}/{maxNoteLength}
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </ScrollArea>
  );
}
