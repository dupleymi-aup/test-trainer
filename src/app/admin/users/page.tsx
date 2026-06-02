"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Search,
  MoreHorizontal,
  UserMinus,
  UserCheck,
  Shield,
  UserPlus,
  Eye,
  AlertTriangle,
  X,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  university: string | null;
  group: string | null;
  _count: { attempts: number; groups: number };
}

const roleLabels: Record<string, string> = {
  STUDENT: "Студент",
  TEACHER: "Преподаватель",
  ADMIN: "Администратор",
};

const roleColors: Record<string, string> = {
  STUDENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  TEACHER: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  ADMIN: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
};

const createUserSchema = z.object({
  name: z.string().min(2, "Имя должно быть не менее 2 символов"),
  email: z.string().email("Неверный формат email"),
  phone: z.string().min(10, "Номер телефона должен быть не менее 10 символов").optional().or(z.literal("")),
  password: z.string().min(8, "Пароль должен быть не менее 8 символов"),
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"]),
  university: z.string().optional(),
  group: z.string().optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

function SortIcon({ field, sortBy, sortDir }: { field: string; sortBy: string; sortDir: string }) {
  if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground" />;
  return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showDeleted, setShowDeleted] = useState(false);
  const limit = 20;
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [importRole, setImportRole] = useState("STUDENT");
  const [importPassword, setImportPassword] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "STUDENT",
      university: "",
      group: "",
    },
  });

  const fetchUsers = useCallback(
    (overridePage?: number) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      params.set("page", String(overridePage ?? page));
      params.set("limit", String(limit));
      if (showDeleted) params.set("showDeleted", "true");
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);

      fetch(`/api/admin/users?${params}`)
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          setUsers(data.users);
          setTotalPages(data.pagination.totalPages);
          setTotal(data.pagination.total);
          setLoading(false);
        })
        .catch(() => {
          toast.error("Не удалось загрузить список пользователей");
          setLoading(false);
        });
    },
    [search, roleFilter, page, limit, showDeleted, sortBy, sortDir]
  );

  // Single effect — fetch when any parameter changes
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      fetchUsers();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, roleFilter, page, showDeleted, sortBy, sortDir, fetchUsers]);

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    const res = await apiFetch(`/api/admin/users/${id}/toggle-active`, { method: "PATCH" });
    if (res.ok) {
      toast.success(currentlyActive ? "Пользователь деактивирован" : "Пользователь активирован");
      fetchUsers();
    }
  };

  const handleRoleChange = async () => {
    if (!roleChangeUser || !newRole) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/admin/users/${roleChangeUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast.success(`Роль изменена на ${roleLabels[newRole]}`);
        setShowRoleModal(false);
        setRoleChangeUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Ошибка при изменении роли");
      }
    } catch (e) {
      logger.error("Admin users: role change failed", { error: e instanceof Error ? e.message : String(e) });
      toast.error("Ошибка при изменении роли");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportCSV = async () => {
    if (!csvContent.trim()) {
      toast.error("Вставьте содержимое CSV");
      return;
    }
    if (!importPassword || importPassword.length < 8) {
      toast.error("Пароль должен содержать минимум 8 символов");
      return;
    }
    setImporting(true);
    try {
      const res = await apiFetch("/api/admin/users/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: csvContent.trim(),
          defaultRole: importRole,
          defaultPassword: importPassword,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setImportResult({ created: json.created, skipped: json.skipped });
        toast.success(`Импортировано: ${json.created}, пропущено: ${json.skipped}`);
        fetchUsers();
      } else {
        toast.error(json.error || "Ошибка при импорте");
      }
    } catch {
      toast.error("Ошибка при импорте");
    } finally {
      setImporting(false);
    }
  };

  const handleCreateUser = async (data: CreateUserForm) => {
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Пользователь создан");
        setShowCreateModal(false);
        createForm.reset();
        fetchUsers();
      } else {
        const json = await res.json();
        toast.error(json.error || "Ошибка при создании пользователя");
      }
    } catch (e) {
      logger.error("Admin users: user creation failed", { error: e instanceof Error ? e.message : String(e) });
      toast.error("Ошибка при создании пользователя");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/admin/users/${selectedUser.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Пользователь удален");
        setShowDeleteConfirm(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Ошибка при удалении");
      }
    } catch (e) {
      logger.error("Admin users: user deletion failed", { error: e instanceof Error ? e.message : String(e) });
      toast.error("Ошибка при удалении");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreUser = async (user: User) => {
    const res = await apiFetch(`/api/admin/users/${user.id}/restore`, { method: "PATCH" });
    if (res.ok) {
      toast.success("Пользователь восстановлен");
      fetchUsers();
    } else {
      const data = await res.json();
      toast.error(data.error || "Ошибка при восстановлении");
    }
  };

  const handleBulkToggleActive = async (activate: boolean) => {
    if (selectedUsers.size === 0) return;
    let success = 0;
    let failed = 0;
    for (const id of selectedUsers) {
      const res = await apiFetch(`/api/admin/users/${id}/toggle-active`, { method: "PATCH" });
      if (res.ok) success++;
      else failed++;
    }
    if (success > 0) {
      toast.success(`${success} пользователей ${activate ? "активировано" : "деактивировано"}`);
    }
    if (failed > 0) {
      toast.error(`Не удалось изменить ${failed} пользователей`);
    }
    setSelectedUsers(new Set());
    fetchUsers();
  };

  const toggleSelectUser = (id: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;

  return (
    <AdminLayout>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Управление пользователями</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={showDeleted ? "default" : "outline"}
                size="sm"
                onClick={() => { setShowDeleted(!showDeleted); setPage(1); }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Удалённые
              </Button>
              <Button onClick={() => setShowCreateModal(true)} size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Создать пользователя
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setShowImportModal(true); setImportResult(null); setCsvContent(""); }}>
                <Upload className="mr-2 h-4 w-4" />
                Импорт CSV
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск..."
                className="pl-8"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все роли</SelectItem>
                <SelectItem value="STUDENT">Студент</SelectItem>
                <SelectItem value="TEACHER">Преподаватель</SelectItem>
                <SelectItem value="ADMIN">Администратор</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {selectedUsers.size > 0 && (
            <div className="px-6 py-3 bg-muted/50 border-b flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Выбрано: {selectedUsers.size}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkToggleActive(true)}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Активировать
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkToggleActive(false)}
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Деактивировать
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUsers(new Set())}
              >
                <X className="mr-2 h-4 w-4" />
                Снять выбор
              </Button>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.size === users.length && users.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>
                  <button onClick={() => handleSort("name")} className="flex items-center font-medium">
                    Имя <SortIcon field="name" sortBy={sortBy} sortDir={sortDir} />
                  </button>
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead className="hidden lg:table-cell">Университет</TableHead>
                <TableHead className="hidden lg:table-cell">Группа</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>
                  <button onClick={() => handleSort("attempts")} className="flex items-center font-medium">
                    Попытки <SortIcon field="attempts" sortBy={sortBy} sortDir={sortDir} />
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => handleSort("createdAt")} className="flex items-center font-medium">
                    Дата регистрации <SortIcon field="createdAt" sortBy={sortBy} sortDir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleSelectUser(user.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{user.name || "—"}</TableCell>
                  <TableCell>{user.email || user.phone || "—"}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role]}>{roleLabels[user.role]}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{user.university || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{user.group || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Активен" : "Неактивен"}
                    </Badge>
                  </TableCell>
                  <TableCell>{user._count.attempts}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedUser(user); setShowDetailsModal(true); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Просмотр
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setRoleChangeUser(user); setNewRole(user.role); setShowRoleModal(true); }}>
                          <Shield className="h-4 w-4 mr-2" />
                          Изменить роль
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(user.id, user.isActive)}>
                          {user.isActive ? <UserMinus className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                          {user.isActive ? "Деактивировать" : "Активировать"}
                        </DropdownMenuItem>
                        {showDeleted && (
                          <DropdownMenuItem onClick={() => handleRestoreUser(user)}>
                            <RotateCcw className="h-4 w-4 mr-2 text-green-600" />
                            <span className="text-green-600">Восстановить</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { setSelectedUser(user); setShowDeleteConfirm(true); }}>
                          <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                          <span className="text-red-600">Удалить</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Показано {users.length} из {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV Import Modal */}
      <Dialog open={showImportModal} onOpenChange={(open) => { setShowImportModal(open); if (!open) { setImportResult(null); setCsvContent(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Импорт пользователей из CSV</DialogTitle>
            <DialogDescription>
              Формат: name,email,phone,group,university (первая строка — заголовок)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>CSV содержимое</Label>
              <Textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder={`name,email,phone,group,university\nИванов Иван,ivan@example.com,+79991234567,ИТ-101,МГУ`}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Роль по умолчанию</Label>
                <Select value={importRole} onValueChange={setImportRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">Студент</SelectItem>
                    <SelectItem value="TEACHER">Преподаватель</SelectItem>
                    <SelectItem value="ADMIN">Администратор</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Пароль по умолчанию *</Label>
                <Input
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                  placeholder="Минимум 8 символов"
                  type="password"
                />
                {importPassword && importPassword.length < 8 && (
                  <p className="text-sm text-red-600 mt-1">Пароль должен содержать минимум 8 символов</p>
                )}
              </div>
            </div>
            {importResult && (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm">
                    <span className="text-emerald-600 font-medium">Создано: {importResult.created}</span>
                    {" | "}
                    <span className="text-muted-foreground">Пропущено: {importResult.skipped}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)}>Закрыть</Button>
            <Button onClick={handleImportCSV} disabled={importing}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Импортировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Создание нового пользователя</DialogTitle>
            <DialogDescription>
              Заполните данные для создания нового пользователя. Администратор сможет менять роль позже.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreateUser)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Имя *</Label>
                <Input
                  id="create-name"
                  {...createForm.register("name")}
                  placeholder="Иван Иванов"
                />
                {createForm.formState.errors.name && (
                  <p className="text-sm text-red-600">{createForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  {...createForm.register("email")}
                  placeholder="email@example.com"
                />
                {createForm.formState.errors.email && (
                  <p className="text-sm text-red-600">{createForm.formState.errors.email.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-phone">Телефон</Label>
                <Input
                  id="create-phone"
                  {...createForm.register("phone")}
                  placeholder="+79991234567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Пароль *</Label>
                <Input
                  id="create-password"
                  type="password"
                  {...createForm.register("password")}
                  placeholder="••••••••"
                />
                {createForm.formState.errors.password && (
                  <p className="text-sm text-red-600">{createForm.formState.errors.password.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Роль *</Label>
              <Select
                onValueChange={(v) => createForm.setValue("role", v as CreateUserForm["role"])}
                defaultValue={createForm.getValues("role")}
              >
                <SelectTrigger id="create-role">
                  <SelectValue placeholder="Выберите роль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Студент</SelectItem>
                  <SelectItem value="TEACHER">Преподаватель</SelectItem>
                  <SelectItem value="ADMIN">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-university">Университет</Label>
                <Input
                  id="create-university"
                  {...createForm.register("university")}
                  placeholder="МГУ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-group">Группа</Label>
                <Input
                  id="create-group"
                  {...createForm.register("group")}
                  placeholder="ИТ-101"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Role Modal */}
      <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменение роли пользователя</DialogTitle>
            <DialogDescription>
              Вы изменяете роль для <strong>{roleChangeUser?.name || roleChangeUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
              <Badge className={roleColors[roleChangeUser?.role || ""]}>
                {roleLabels[roleChangeUser?.role || ""]}
              </Badge>
              <span className="text-muted-foreground">→</span>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Студент</SelectItem>
                  <SelectItem value="TEACHER">Преподаватель</SelectItem>
                  <SelectItem value="ADMIN">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newRole === "ADMIN" && roleChangeUser?.role !== "ADMIN" && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-300">Внимание!</p>
                  <p className="text-amber-700 dark:text-amber-400">
                    Вы предоставляете полные права администратора, включая управление пользователями, ролями и системными настройками.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleRoleChange} disabled={isSubmitting || newRole === roleChangeUser?.role}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Изменить роль
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Информация о пользователе</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">ID</Label>
                  <p className="text-sm font-mono truncate">{selectedUser.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Роль</Label>
                  <div className="mt-1">
                    <Badge className={roleColors[selectedUser.role]}>{roleLabels[selectedUser.role]}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Имя</Label>
                  <p className="text-sm">{selectedUser.name || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="text-sm">{selectedUser.email || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Телефон</Label>
                  <p className="text-sm">{selectedUser.phone || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Статус</Label>
                  <div className="mt-1">
                    <Badge variant={selectedUser.isActive ? "default" : "secondary"}>
                      {selectedUser.isActive ? "Активен" : "Неактивен"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Университет</Label>
                  <p className="text-sm">{selectedUser.university || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Группа</Label>
                  <p className="text-sm">{selectedUser.group || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold">{selectedUser._count.attempts}</p>
                  <p className="text-xs text-muted-foreground">Попытки</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{selectedUser._count.groups}</p>
                  <p className="text-xs text-muted-foreground">Группы</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {new Date(selectedUser.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                  <p className="text-xs text-muted-foreground">Дата регистрации</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailsModal(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Удаление пользователя
            </DialogTitle>
            <DialogDescription>
              Вы действительно хотите удалить пользователя <strong>{selectedUser?.name || selectedUser?.email}</strong>?
              Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
