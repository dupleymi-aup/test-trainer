"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { User, LogOut, BarChart3, Shield, GraduationCap } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-auto text-muted-foreground border-dashed">
          Демо
        </Badge>
        <Button asChild variant="default" size="sm">
          <Link href="/login">Войти</Link>
        </Button>
      </div>
    );
  }

  const name = session.user.name || "Пользователь";
  const email = session.user.email || "";
  const role = session.user.role || "STUDENT";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Меню пользователя">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{name}</span>
              <Badge className={`${roleColors[role]} text-[10px] px-1 py-0 h-auto`}>
                {roleLabels[role]}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground truncate">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {role === "ADMIN" && (
            <DropdownMenuItem asChild>
              <Link href="/admin" className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4" />
                Панель администратора
              </Link>
            </DropdownMenuItem>
          )}
          {(role === "TEACHER" || role === "ADMIN") && (
            <DropdownMenuItem asChild>
              <Link href="/teacher" className="cursor-pointer">
                <GraduationCap className="mr-2 h-4 w-4" />
                Панель преподавателя
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Профиль
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile?tab=stats" className="cursor-pointer">
              <BarChart3 className="mr-2 h-4 w-4" />
              Статистика
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ redirect: true, callbackUrl: "/" })}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
