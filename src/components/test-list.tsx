"use client";

import { useState, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, Send, AlertCircle, Keyboard, Lightbulb, Pencil, Save, X, GripVertical, Wand2, Copy, CheckSquare, Square, GitBranch, ChevronDown, ChevronUp } from "lucide-react";
import { type Task, type TestCaseCategory } from "@/lib/tasks";
import { type TestCase, evaluateTestCases } from "@/lib/evaluator";
import { categories, categoryColors } from "@/lib/constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TestListProps {
  task: Task | null;
  testCases: TestCase[];
  onRemove: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onEdit: (id: string, updates: Partial<{ inputs: string[], expectedOutput: string, category: TestCaseCategory, comment: string }>) => void;
  onSubmit: () => void;
  onShowHint?: () => void;
  onFillAllEc?: () => void;
  onFillAllBv?: () => void;
  onReorder?: (reordered: TestCase[]) => void;
  onBulkRemove?: (ids: string[]) => void;
  onClearAll?: () => void;
}

const CoverageBar = memo(function CoverageBar({ task, evaluationResult }: { task: Task | null; evaluationResult: ReturnType<typeof evaluateTestCases> | null }) {
  if (!task || !evaluationResult) return null;

  const ecPercent = evaluationResult.totalEcs > 0 ? (evaluationResult.coveredEcsCount / evaluationResult.totalEcs) * 100 : 0;
  const bvPercent = evaluationResult.totalBvs > 0 ? (evaluationResult.coveredBvsCount / evaluationResult.totalBvs) * 100 : 0;

  const colorClass = (pct: number) =>
    pct >= 100 ? "bg-emerald-500 dark:bg-emerald-400" : pct >= 50 ? "bg-amber-500 dark:bg-amber-400" : "bg-rose-500 dark:bg-rose-400";

  const textColor = (pct: number) =>
    pct >= 100 ? "text-emerald-600 dark:text-emerald-400" : pct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";

  return (
    <div className="px-4 pb-3 space-y-2">
      <div className="flex items-center gap-3">
        {/* EC coverage */}
        <div className="flex-1 space-y-0.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-medium text-muted-foreground">EC: {evaluationResult.coveredEcsCount}/{evaluationResult.totalEcs}</span>
            <span className={`font-semibold ${textColor(ecPercent)}`}>{Math.round(ecPercent)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${colorClass(ecPercent)}`}
              style={{ width: `${ecPercent}%` }}
            />
          </div>
        </div>
        {/* BV coverage */}
        <div className="flex-1 space-y-0.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-medium text-muted-foreground">BV: {evaluationResult.coveredBvsCount}/{evaluationResult.totalBvs}</span>
            <span className={`font-semibold ${textColor(bvPercent)}`}>{Math.round(bvPercent)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${colorClass(bvPercent)}`}
              style={{ width: `${bvPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

const UncoveredChecklist = memo(function UncoveredChecklist({ task, evaluationResult }: { task: Task | null; evaluationResult: ReturnType<typeof evaluateTestCases> | null }) {
  const [open, setOpen] = useState(false);

  const uncovered = useMemo(() => {
    if (!task || !evaluationResult) return null;
    if (evaluationResult.uncoveredEcIds.length === 0 && evaluationResult.uncoveredBvDescriptions.length === 0) return null;

    const uncoveredEcs = evaluationResult.uncoveredEcIds
      .map((id) => task.equivalenceClasses.find((ec) => ec.id === id))
      .filter((ec): ec is NonNullable<ReturnType<typeof task.equivalenceClasses.find>> => ec !== undefined)
      .map((ec) => ({ id: ec.id, name: ec.name, description: ec.description }));

    const uncoveredBvs = task.boundaryValues
      .filter((bv) => evaluationResult.uncoveredBvDescriptions.includes(bv.description))
      .map((bv) => ({ description: bv.description, value: bv.value }));

    return { ecs: uncoveredEcs, bvs: uncoveredBvs };
  }, [task, evaluationResult]);

  if (!uncovered) return null;

  const total = uncovered.ecs.length + uncovered.bvs.length;

  return (
    <div className="px-4 pb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <AlertCircle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
        <span className="font-medium">Не покрыто: {total}</span>
        {open ? (
          <ChevronUp className="h-3 w-3 ml-auto shrink-0" />
        ) : (
          <ChevronDown className="h-3 w-3 ml-auto shrink-0" />
        )}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
          {uncovered.ecs.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Классы эквивалентности:</p>
              {uncovered.ecs.map((ec) => (
                <div
                  key={ec.id}
                  className="text-[11px] bg-muted/40 rounded-md px-2 py-1.5 flex items-start gap-2"
                >
                  <span className="text-amber-500 dark:text-amber-400 shrink-0 mt-px">○</span>
                  <div>
                    <span className="font-medium">{ec.name}</span>
                    <span className="text-muted-foreground ml-1">— {ec.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {uncovered.bvs.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Граничные значения:</p>
              {uncovered.bvs.map((bv, i) => (
                <div
                  key={i}
                  className="text-[11px] bg-muted/40 rounded-md px-2 py-1.5 flex items-start gap-2"
                >
                  <span className="text-amber-500 dark:text-amber-400 shrink-0 mt-px">○</span>
                  <div>
                    <code className="font-mono text-amber-700 dark:text-amber-400">
                      {Array.isArray(bv.value) ? `[${bv.value.join(", ")}]` : String(bv.value)}
                    </code>
                    <span className="text-muted-foreground ml-1">— {bv.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

const SortableRow = memo(function SortableRow({
  tc,
  idx,
  editingId,
  editInputs,
  editExpectedOutput,
  editCategory,
  editComment,
  startEditing,
  cancelEditing,
  saveEditing,
  onRemove,
  onDuplicate,
  setEditInputs,
  setEditExpectedOutput,
  setEditCategory,
  setEditComment,
  bulkMode,
  selected,
  onToggleSelect,
}: {
  tc: TestCase;
  idx: number;
  editingId: string | null;
  editInputs: string[];
  editExpectedOutput: string;
  editCategory: TestCaseCategory;
  editComment: string;
  startEditing: (tc: TestCase) => void;
  cancelEditing: () => void;
  saveEditing: () => void;
  onRemove: (id: string) => void;
  onDuplicate?: (id: string) => void;
  setEditInputs: (v: string[]) => void;
  setEditExpectedOutput: (v: string) => void;
  setEditCategory: (v: TestCaseCategory) => void;
  setEditComment: (v: string) => void;
  bulkMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const checkboxCell = bulkMode ? (
    <TableCell className="py-2 w-10">
      <button onClick={() => onToggleSelect(tc.id)} aria-label="Выбрать">
        {selected ? (
          <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Square className="h-4 w-4 text-muted-foreground/40 hover:text-muted-foreground" />
        )}
      </button>
    </TableCell>
  ) : null;

  if (editingId === tc.id) {
    return (
      <TableRow ref={setNodeRef} style={style}>
        {checkboxCell}
        <TableCell className="text-xs text-muted-foreground py-2">
          {idx + 1}
        </TableCell>
        <TableCell className="py-2">
          <div className="space-y-1">
            {editInputs.map((val, i) => (
              <Input
                key={i}
                value={val}
                onChange={(e) => {
                  const newInputs = [...editInputs];
                  newInputs[i] = e.target.value;
                  setEditInputs(newInputs);
                }}
                className="h-7 text-xs"
                placeholder={`Параметр ${i + 1}`}
              />
            ))}
          </div>
          <Textarea
            value={editComment}
            onChange={(e) => setEditComment(e.target.value)}
            className="mt-1 min-h-[2rem] h-8 text-[10px] resize-none"
            placeholder="Комментарий"
          />
        </TableCell>
        <TableCell className="py-2">
          <Input
            value={editExpectedOutput}
            onChange={(e) => setEditExpectedOutput(e.target.value)}
            className="h-7 text-xs"
            placeholder="Ожидаемый результат"
          />
        </TableCell>
        <TableCell className="py-2">
          <Select
            value={editCategory}
            onValueChange={(v) => setEditCategory(v as TestCaseCategory)}
          >
            <SelectTrigger className="h-7 text-xs w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="py-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-emerald-600 dark:text-emerald-400"
              onClick={saveEditing}
              aria-label="Сохранить"
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={cancelEditing}
              aria-label="Отмена"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      {checkboxCell}
      <TableCell className="text-xs text-muted-foreground py-2 w-12">
        <div className="flex items-center gap-1">
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none"
            {...attributes}
            {...listeners}
            aria-label="Перетащить"
          >
            <GripVertical className="h-3 w-3" />
          </button>
          <span>{idx + 1}</span>
        </div>
      </TableCell>
      <TableCell className="py-2">
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
          {tc.inputs.join(", ")}
        </code>
        {tc.comment && (
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]">
            {tc.comment}
          </p>
        )}
      </TableCell>
      <TableCell className="py-2">
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono max-w-[120px] inline-block truncate">
          {tc.expectedOutput}
        </code>
      </TableCell>
      <TableCell className="py-2">
        <Badge
          variant="secondary"
          className={`text-[10px] px-1.5 py-0 ${categoryColors[tc.category]}`}
        >
          {tc.category}
        </Badge>
      </TableCell>
      <TableCell className="py-2">
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => startEditing(tc)}
            aria-label={`Редактировать тест-кейс ${idx + 1}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {onDuplicate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-emerald-600 dark:text-emerald-400"
                  onClick={() => onDuplicate(tc.id)}
                  aria-label={`Дублировать тест-кейс ${idx + 1}`}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Дублировать</TooltipContent>
            </Tooltip>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(tc.id)}
            aria-label={`Удалить тест-кейс ${idx + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

export const TestList = memo(function TestList({ task, testCases, onRemove, onDuplicate, onEdit, onSubmit, onShowHint, onFillAllEc, onFillAllBv, onReorder, onBulkRemove, onClearAll }: TestListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInputs, setEditInputs] = useState<string[]>([]);
  const [editExpectedOutput, setEditExpectedOutput] = useState("");
  const [editCategory, setEditCategory] = useState<TestCaseCategory>("Нормальное значение");
  const [editComment, setEditComment] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const evaluationResult = useMemo(() => {
    if (!task || testCases.length === 0) return null;
    return evaluateTestCases(task, testCases);
  }, [task, testCases]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorder) {
      const oldIndex = testCases.findIndex((tc) => tc.id === active.id);
      const newIndex = testCases.findIndex((tc) => tc.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(testCases, oldIndex, newIndex));
      }
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === testCases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(testCases.map((tc) => tc.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (onBulkRemove) {
      onBulkRemove(ids);
    } else {
      ids.forEach((id) => onRemove(id));
    }
    setSelectedIds(new Set());
    setBulkMode(false);
  };

  if (testCases.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Нет добавленных тест-кейсов.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Добавьте хотя бы один тест-кейс для проверки.
          </p>
        </CardContent>
      </Card>
    );
  }

  const startEditing = (tc: TestCase) => {
    setEditingId(tc.id);
    setEditInputs([...tc.inputs]);
    setEditExpectedOutput(tc.expectedOutput);
    setEditCategory(tc.category);
    setEditComment(tc.comment || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = () => {
    if (editingId) {
      onEdit(editingId, {
        inputs: editInputs,
        expectedOutput: editExpectedOutput,
        category: editCategory,
        comment: editComment,
      });
      setEditingId(null);
    }
  };

  return (
    <>
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            Тест-кейсы ({testCases.length})
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={bulkMode ? "default" : "outline"}
                  className={`text-xs gap-1 h-7 ${bulkMode ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                  onClick={() => {
                    setBulkMode(!bulkMode);
                    setSelectedIds(new Set());
                  }}
                  title="Массовое выделение"
                >
                  {bulkMode ? (
                    <CheckSquare className="h-3.5 w-3.5" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Выделение</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Массовое выделение</TooltipContent>
            </Tooltip>
            {onFillAllEc && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/20"
                onClick={onFillAllEc}
                title="Автоматически добавить тесты для всех непокрытых классов эквивалентности"
              >
                <Wand2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Заполнить EC</span>
              </Button>
            )}
            {onFillAllBv && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1 text-sky-700 border-sky-300 hover:bg-sky-50 dark:text-sky-400 dark:border-sky-800 dark:hover:bg-sky-900/20"
                onClick={onFillAllBv}
                title="Автоматически добавить тесты для всех непокрытых граничных значений"
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Заполнить BV</span>
              </Button>
            )}
            {onShowHint && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1"
                onClick={onShowHint}
                title="Показать подсказку — добавить тест для случайного непокрытого класса"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Подсказка</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1 text-rose-600 border-rose-300 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-900/20"
              onClick={() => setClearDialogOpen(true)}
              title="Очистить все тест-кейсы"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Очистить всё</span>
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onSubmit}
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Проверить
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Bulk selection floating bar */}
        {bulkMode && selectedIds.size > 0 && (
          <div className="sticky top-0 z-10 mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 shadow-sm">
            <span className="text-xs font-medium text-rose-700 dark:text-rose-400">
              Выбрано: {selectedIds.size}
            </span>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="destructive"
              className="text-xs gap-1 h-7"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Удалить выделенные
            </Button>
          </div>
        )}

        {/* Coverage bar */}
        <CoverageBar task={task} evaluationResult={evaluationResult} />

        {/* Uncovered checklist */}
        <UncoveredChecklist task={task} evaluationResult={evaluationResult} />

        <div className="max-h-80 overflow-y-auto custom-scrollbar">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {bulkMode && (
                    <TableHead className="text-xs w-10">
                      <button onClick={toggleSelectAll} aria-label="Выбрать все">
                        {selectedIds.size === testCases.length ? (
                          <CheckSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Square className="h-3.5 w-3.5 text-muted-foreground/40" />
                        )}
                      </button>
                    </TableHead>
                  )}
                  <TableHead className="text-xs w-12">#</TableHead>
                  <TableHead className="text-xs">Вход</TableHead>
                  <TableHead className="text-xs">Ожидание</TableHead>
                  <TableHead className="text-xs">Категория</TableHead>
                  <TableHead className="text-xs w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={testCases.map((tc) => tc.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {testCases.map((tc, idx) => (
                    <SortableRow
                      key={tc.id}
                      tc={tc}
                      idx={idx}
                      editingId={editingId}
                      editInputs={editInputs}
                      editExpectedOutput={editExpectedOutput}
                      editCategory={editCategory}
                      editComment={editComment}
                      startEditing={startEditing}
                      cancelEditing={cancelEditing}
                      saveEditing={saveEditing}
                      onRemove={onRemove}
                      onDuplicate={onDuplicate}
                      setEditInputs={setEditInputs}
                      setEditExpectedOutput={setEditExpectedOutput}
                      setEditCategory={setEditCategory}
                      setEditComment={setEditComment}
                      bulkMode={bulkMode}
                      selected={selectedIds.has(tc.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </div>
      </CardContent>
      {/* Keyboard shortcut hint */}
      <div className="px-4 pb-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Keyboard className="h-3 w-3" />
          <span>
            <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[9px]">Ctrl</kbd>
            {" + "}
            <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[9px]">Enter</kbd>
            {" — проверить"}
          </span>
        </div>
        <GripVertical className="h-3 w-3" />
      </div>
    </Card>

    <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Очистить все тест-кейсы?</AlertDialogTitle>
          <AlertDialogDescription>
            Все {testCases.length} тест-кейс(ов) будут удалены. Это действие нельзя отменить.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (onClearAll) {
                onClearAll();
              } else {
                testCases.forEach((tc) => onRemove(tc.id));
              }
              setClearDialogOpen(false);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Удалить всё
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
});
