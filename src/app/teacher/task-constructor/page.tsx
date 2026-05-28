"use client";

import { useState } from "react";
import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Save,
  FileCode,
  Layers,
  GitBranch,
  AlertTriangle,
  Copy,
  Eye,
} from "lucide-react";

interface EquivalenceClass {
  id: string;
  name: string;
  description: string;
  exampleValues: string;
}

interface BoundaryValue {
  value: string;
  description: string;
}

interface TaskParam {
  name: string;
  type: string;
  description: string;
}

interface CustomTask {
  id?: string | number;
  name?: string;
  signature?: string;
  description?: string;
  difficulty?: Difficulty;
  topics?: string[];
  equivalenceClasses?: unknown[];
  boundaryValues?: unknown[];
  solution?: string;
  params?: TaskParam[];
  [key: string]: unknown;
}

type Difficulty = "Легко" | "Средне" | "Сложно";

const STORAGE_KEY = "teacher-custom-tasks";

function loadCustomTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomTasks(tasks: CustomTask[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      console.warn("LocalStorage quota exceeded, cannot save custom tasks");
    }
  }
}

export default function TaskConstructorPage() {
  const [activeTab, setActiveTab] = useState("editor");
  const [taskName, setTaskName] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Средне");
  const [description, setDescription] = useState("");
  const [signature, setSignature] = useState("");
  const [returnType, setReturnType] = useState("number");
  const [code, setCode] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");

  const [params, setParams] = useState<TaskParam[]>([]);
  const [paramName, setParamName] = useState("");
  const [paramType, setParamType] = useState("number");
  const [paramDesc, setParamDesc] = useState("");

  const [ecs, setEcs] = useState<EquivalenceClass[]>([]);
  const [ecName, setEcName] = useState("");
  const [ecDesc, setEcDesc] = useState("");
  const [ecExample, setEcExample] = useState("");

  const [bvs, setBvs] = useState<BoundaryValue[]>([]);
  const [bvValue, setBvValue] = useState("");
  const [bvDesc, setBvDesc] = useState("");

  const [commonMistakes, setCommonMistakes] = useState<string[]>([]);
  const [mistakeInput, setMistakeInput] = useState("");

  const [savedTasks, setSavedTasks] = useState<CustomTask[]>(() => loadCustomTasks());

  const addParam = () => {
    if (!paramName.trim()) return;
    setParams([...params, { name: paramName.trim(), type: paramType, description: paramDesc.trim() }]);
    setParamName("");
    setParamDesc("");
  };

  const removeParam = (idx: number) => setParams(params.filter((_, i) => i !== idx));

  const addEc = () => {
    if (!ecName.trim()) return;
    const id = `ec${ecs.length + 1}`;
    setEcs([...ecs, { id, name: ecName.trim(), description: ecDesc.trim(), exampleValues: ecExample.trim() }]);
    setEcName("");
    setEcDesc("");
    setEcExample("");
  };

  const removeEc = (idx: number) => setEcs(ecs.filter((_, i) => i !== idx));

  const addBv = () => {
    if (!bvValue.trim()) return;
    setBvs([...bvs, { value: bvValue.trim(), description: bvDesc.trim() }]);
    setBvValue("");
    setBvDesc("");
  };

  const removeBv = (idx: number) => setBvs(bvs.filter((_, i) => i !== idx));

  const addTopic = () => {
    if (!topicInput.trim() || topics.includes(topicInput.trim())) return;
    setTopics([...topics, topicInput.trim()]);
    setTopicInput("");
  };

  const removeTopic = (topic: string) => setTopics(topics.filter((t) => t !== topic));

  const addMistake = () => {
    if (!mistakeInput.trim()) return;
    setCommonMistakes([...commonMistakes, mistakeInput.trim()]);
    setMistakeInput("");
  };

  const removeMistake = (idx: number) => setCommonMistakes(commonMistakes.filter((_, i) => i !== idx));

  const saveTask = () => {
    if (!taskName.trim() || !description.trim() || !signature.trim()) {
      toast.error("Заполните название, описание и сигнатуру");
      return;
    }
    if (ecs.length === 0) {
      toast.error("Добавьте хотя бы один класс эквивалентности");
      return;
    }

    const task = {
      id: Date.now(),
      name: taskName.trim(),
      difficulty,
      description: description.trim(),
      signature: signature.trim(),
      returnType,
      code: code.trim(),
      topics,
      params,
      equivalenceClasses: ecs.map((ec) => ({
        ...ec,
        exampleValues: ec.exampleValues.split(",").map((v) => {
          const trimmed = v.trim();
          const num = Number(trimmed);
          if (trimmed !== "" && !isNaN(num)) return num;
          if (trimmed === "true") return true;
          if (trimmed === "false") return false;
          if (trimmed === "null") return null;
          return trimmed;
        }),
      })),
      boundaryValues: bvs.map((bv) => ({
        value: (() => {
          const trimmed = bv.value.trim();
          const num = Number(trimmed);
          if (trimmed !== "" && !isNaN(num)) return num;
          if (trimmed === "true") return true;
          if (trimmed === "false") return false;
          if (trimmed === "null") return null;
          return trimmed;
        })(),
        description: bv.description.trim(),
      })),
      commonMistakes,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedTasks, task];
    setSavedTasks(updated);
    saveCustomTasks(updated);
    toast.success(`Задание «${task.name}» сохранено!`);
  };

  const deleteTask = (id: string | number) => {
    const updated = savedTasks.filter((t) => t.id !== id);
    setSavedTasks(updated);
    saveCustomTasks(updated);
    toast.info("Задание удалено");
  };

  const clearForm = () => {
    setTaskName("");
    setDifficulty("Средне");
    setDescription("");
    setSignature("");
    setReturnType("number");
    setCode("");
    setTopics([]);
    setParams([]);
    setEcs([]);
    setBvs([]);
    setCommonMistakes([]);
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileCode className="h-6 w-6 text-emerald-600" />
              Конструктор заданий
            </h1>
            <p className="text-muted-foreground mt-1">
              Создавайте собственные задания с классами эквивалентности и граничными значениями
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            Сохранено: {savedTasks.length}
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="editor">Редактор</TabsTrigger>
            <TabsTrigger value="saved">Сохранённые ({savedTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Основная информация</CardTitle>
                <CardDescription>Название, описание и сигнатура функции</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Название задания *</Label>
                    <Input
                      placeholder="Например: factorial(n)"
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Сложность</Label>
                    <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Легко">Легко</SelectItem>
                        <SelectItem value="Средне">Средне</SelectItem>
                        <SelectItem value="Сложно">Сложно</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Сигнатура функции *</Label>
                  <Input
                    placeholder="factorial(n: number): number"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Описание *</Label>
                  <Textarea
                    placeholder="Опишите, что должна делать функция..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Тип возвращаемого значения</Label>
                    <Input
                      placeholder="number, boolean, string..."
                      value={returnType}
                      onChange={(e) => setReturnType(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Темы (добавляйте через Enter)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Классы эквивалентности"
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTopic();
                          }
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addTopic}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {topics.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                          <button
                            onClick={() => removeTopic(t)}
                            aria-label={`Удалить тему "${t}"`}
                            className="ml-1.5 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Parameters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-teal-600" />
                  Параметры функции
                </CardTitle>
                <CardDescription>Входные параметры функции</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-3"
                    placeholder="Имя (n)"
                    value={paramName}
                    onChange={(e) => setParamName(e.target.value)}
                  />
                  <Select value={paramType} onValueChange={setParamType}>
                    <SelectTrigger className="col-span-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">number</SelectItem>
                      <SelectItem value="string">string</SelectItem>
                      <SelectItem value="boolean">boolean</SelectItem>
                      <SelectItem value="array">array</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="col-span-5"
                    placeholder="Описание"
                    value={paramDesc}
                    onChange={(e) => setParamDesc(e.target.value)}
                  />
                  <Button variant="outline" size="sm" className="col-span-2" onClick={addParam}>
                    <Plus className="h-4 w-4 mr-1" /> Добавить
                  </Button>
                </div>

                {params.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Имя</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Описание</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {params.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-sm">{p.name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{p.type}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.description}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => removeParam(i)}
                              aria-label={`Удалить параметр ${params[i]?.name}`}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Equivalence Classes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  Классы эквивалентности *
                </CardTitle>
                <CardDescription>
                  Каждый класс — группа входов с одинаковым поведением функции
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-3"
                    placeholder="EC1: n = 0"
                    value={ecName}
                    onChange={(e) => setEcName(e.target.value)}
                  />
                  <Input
                    className="col-span-5"
                    placeholder="Описание класса"
                    value={ecDesc}
                    onChange={(e) => setEcDesc(e.target.value)}
                  />
                  <Input
                    className="col-span-2"
                    placeholder="Пример (0)"
                    value={ecExample}
                    onChange={(e) => setEcExample(e.target.value)}
                  />
                  <Button variant="outline" size="sm" className="col-span-2" onClick={addEc}>
                    <Plus className="h-4 w-4 mr-1" /> Добавить
                  </Button>
                </div>

                {ecs.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Название</TableHead>
                        <TableHead>Описание</TableHead>
                        <TableHead>Пример</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ecs.map((ec, i) => (
                        <TableRow key={ec.id}>
                          <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                          <TableCell className="font-medium text-sm">{ec.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ec.description}</TableCell>
                          <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{ec.exampleValues}</code></TableCell>
                          <TableCell>
                            <button
                              onClick={() => removeEc(i)}
                              aria-label={`Удалить класс эквивалентности ${ecs[i]?.name}`}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Boundary Values */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-amber-600" />
                  Граничные значения
                </CardTitle>
                <CardDescription>
                  Значения на границах диапазонов (min, max, min-1, max+1)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-3"
                    placeholder="Значение (0)"
                    value={bvValue}
                    onChange={(e) => setBvValue(e.target.value)}
                  />
                  <Input
                    className="col-span-7"
                    placeholder="Описание (min-1: значение ниже минимума)"
                    value={bvDesc}
                    onChange={(e) => setBvDesc(e.target.value)}
                  />
                  <Button variant="outline" size="sm" className="col-span-2" onClick={addBv}>
                    <Plus className="h-4 w-4 mr-1" /> Добавить
                  </Button>
                </div>

                {bvs.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Значение</TableHead>
                        <TableHead>Описание</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bvs.map((bv, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                          <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{bv.value}</code></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{bv.description}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => removeBv(i)}
                              aria-label={`Удалить граничное значение ${bvs[i]?.value}`}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Code and Common Mistakes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCode className="h-4 w-4" />
                    Код функции
                  </CardTitle>
                  <CardDescription>Реализация функции (необязательно)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="// Вставьте код функции здесь..."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Типичные ошибки
                  </CardTitle>
                  <CardDescription>Ошибки, которые часто допускают студенты</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Пропуск проверки n < 0"
                      value={mistakeInput}
                      onChange={(e) => setMistakeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addMistake();
                        }
                      }}
                    />
                    <Button variant="outline" size="sm" onClick={addMistake}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {commonMistakes.length > 0 && (
                    <div className="space-y-2">
                      {commonMistakes.map((m, i) => (
                        <div key={i} className="flex items-start justify-between gap-2 p-2 rounded bg-muted/50 text-sm">
                          <span>{m}</span>
                          <button
                            onClick={() => removeMistake(i)}
                            aria-label={`Удалить типичную ошибку: ${commonMistakes[i]}`}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button onClick={saveTask} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Save className="h-4 w-4 mr-2" />
                Сохранить задание
              </Button>
              <Button variant="outline" onClick={clearForm}>
                Очистить форму
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="saved">
            {savedTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileCode className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm">Нет сохранённых заданий</p>
                  <p className="text-xs mt-1">Создайте первое задание в редакторе</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {savedTasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{task.name}</h3>
                            <Badge variant="secondary" className="text-xs">{task.difficulty}</Badge>
                            <Badge variant="outline" className="text-xs">
                              {task.equivalenceClasses?.length || 0} EC, {task.boundaryValues?.length || 0} BV
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                          <code className="text-xs text-muted-foreground font-mono">{task.signature}</code>
                          {task.topics && task.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {task.topics.map((t: string) => (
                                <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(task, null, 2));
                            toast.success("JSON скопирован");
                          }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => task.id != null && deleteTask(task.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TeacherLayout>
  );
}
