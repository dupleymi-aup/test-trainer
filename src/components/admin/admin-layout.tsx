"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ScrollText,
  Database,
  Settings,
  ArrowLeft,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Панель управления", icon: LayoutDashboard },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/groups", label: "Группы", icon: FolderKanban },
  { href: "/admin/activity", label: "Журнал действий", icon: ScrollText },
  { href: "/admin/database", label: "База данных", icon: Database },
  { href: "/admin/settings", label: "Настройки", icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (session.user.role !== "ADMIN") {
      router.push("/");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;
  }

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              На главную
            </Button>
          </Link>
          <div className="flex items-center gap-2 ml-4">
            <Shield className="h-5 w-5 text-amber-600" />
            <h1 className="text-lg font-bold">Панель администратора</h1>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            {session.user.name || session.user.email}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex gap-6 p-4">
        {/* Sidebar */}
        <nav className="w-56 shrink-0">
          <div className="space-y-1 sticky top-20">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-medium"
                        : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
