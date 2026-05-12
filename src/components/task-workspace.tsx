"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Code2,
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
} from "lucide-react";
import type { Task } from "@/lib/tasks";
import { saveTaskNote, loadTaskNote } from "@/lib/storage";
import type { TestCase } from "@/lib/evaluator";
import { evaluateTestCases } from "@/lib/evaluator";

interface TaskWorkspaceProps {
  task: Task;
  testCases?: TestCase[];
}

function highlightCode(code: string): React.ReactNode {
  const lines = code.split("\n");
  return lines.map((line, i) => {
    // Comments (// ...)
    if (line.trimStart().startsWith("//")) {
      return (
        <span key={i}>
          <span className="text-gray-500 italic">{line}</span>
          {i < lines.length - 1 && "\n"}
        </span>
      );
    }

    // Escape HTML to prevent injection and broken markup
    let html = line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Extract strings into placeholders so keywords/numbers inside them stay untouched
    const strings: string[] = [];
    html = html.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, (match) => {
      strings.push(match);
      return `\u0000STR${strings.length - 1}\u0000`;
    });

    // Function names
    html = html.replace(/\b([a-zA-Z_]\w*)\s*\(/g, '<span class="text-blue-400">$1</span>(');

    // Keywords
    const keywords = ["function", "return", "if", "else", "throw", "const", "let", "var", "new", "typeof", "for", "while", "true", "false", "null", "undefined"];
    for (const kw of keywords) {
      const regex = new RegExp(`\\b(${kw})\\b`, "g");
      html = html.replace(regex, '<span class="text-purple-400">$1</span>');
    }

    // Numbers
    html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber-400">$1</span>');

    // Restore strings with highlighting
    strings.forEach((str, idx) => {
      html = html.replace(
        `\u0000STR${idx}\u0000`,
        `<span class="text-emerald-400">${str}</span>`
      );
    });

    return (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: html }} />
        {i < lines.length - 1 && "\n"}
      </span>
    );
  });
}

export function TaskWorkspace({ task, testCases }: TaskWorkspaceProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [note, setNote] = useState(() => loadTaskNote(task.id));
  const [taskNoteId, setTaskNoteId] = useState(task.id);
  const [expandedEcs, setExpandedEcs] = useState<Set<string>>(new Set());
  const [expandedBvs, setExpandedBvs] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (taskNoteId !== task.id) {
      setTaskNoteId(task.id);
      setNote(loadTaskNote(task.id));
    }
  }, [task.id, taskNoteId]);

  const handleBlur = () => {
    saveTaskNote(task.id, note);
  };

  // Live coverage computation
  const coverage = useMemo(() => {
    if (!testCases || testCases.length === 0) return null;
    return evaluateTestCases(task, testCases);
  }, [task, testCases]);

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
            <div className="bg-zinc-900 dark:bg-zinc-950 rounded-lg p-3 overflow-x-auto">
              <div className="flex items-center gap-2 mb-2">
                <Code2 className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-400">
                  Реализация
                </span>
              </div>
              <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                <code>{highlightCode(task.code)}</code>
              </pre>
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
              <Textarea
                value={note}
                onChange={(e) => {
                  if (e.target.value.length <= maxNoteLength) {
                    setNote(e.target.value);
                  }
                }}
                onBlur={handleBlur}
                placeholder="Запишите свои мысли, идеи или наблюдения по этому заданию..."
                className="min-h-[100px] text-sm resize-y"
              />
              <div className="text-right text-[10px] text-muted-foreground">
                {note.length}/{maxNoteLength}
              </div>
            </div>
          )}
        </Card>
      </div>
    </ScrollArea>
  );
}
